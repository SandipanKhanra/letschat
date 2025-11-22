import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../lib/utils.js";
import { sendWelcomeEmail } from "../emails/emailHandler.js";
import "dotenv/config";

const DEFAULT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_EXPIRES_MS = (() => {
  const raw = process.env.REFRESH_TOKEN_EXPIRES_MS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFRESH_MS;
})();

const computeExpiry = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(Date.now() + n);
};

/**
 * Signup a new user, save hashed password, issue access and refresh tokens.
 */
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  // Simple validation
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  // Check if email is valid or not
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullName,
    email,
    password: hashedPassword,
  });

  await newUser.save();

  try {
    await sendWelcomeEmail(
      newUser.email,
      newUser.fullName,
      process.env.CLIENT_URL
    );
  } catch (error) {
    console.error("Failed to send welcome email ❌");
  }

  // Issue tokens
  const accessToken = createAccessToken(newUser._id, { expiresIn: "15m" });
  setAccessTokenCookie(res, accessToken, { maxAge: 15 * 60 * 1000 });

  const refreshTokenPlain = createRefreshToken();
  const refreshHash = hashToken(refreshTokenPlain);
  newUser.refreshTokens.push({
    tokenHash: refreshHash,
    expiresAt: computeExpiry(REFRESH_TOKEN_EXPIRES_MS),
    used: false,
    meta: { ip: req.ip, ua: req.get("user-agent") },
  });
  await newUser.save();
  setRefreshTokenCookie(res, refreshTokenPlain, {
    maxAge: REFRESH_TOKEN_EXPIRES_MS,
  });

  res.status(201).json({
    message: "User created successfully",
    user: {
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    },
  });
};

/**
 * Login: validate credentials, rotate refresh token, return tokens via cookies
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing credentials" });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });

  // Create access token
  const accessToken = createAccessToken(user._id, { expiresIn: "15m" });
  setAccessTokenCookie(res, accessToken, { maxAge: 15 * 60 * 1000 });

  // Create and store refresh token (rotate)
  const refreshTokenPlain = createRefreshToken();
  const refreshHash = hashToken(refreshTokenPlain);
  // Remove expired tokens
  user.refreshTokens = (user.refreshTokens || []).filter(
    (rt) => !rt.expiresAt || rt.expiresAt > new Date()
  );
  user.refreshTokens.push({
    tokenHash: refreshHash,
    expiresAt: computeExpiry(REFRESH_TOKEN_EXPIRES_MS),
    used: false,
    meta: { ip: req.ip, ua: req.get("user-agent") },
  });
  await user.save();
  setRefreshTokenCookie(res, refreshTokenPlain, {
    maxAge: REFRESH_TOKEN_EXPIRES_MS,
  });

  res.json({ message: "Logged in" });
};

/**
 * Refresh endpoint: validates refresh cookie, rotates tokens, and issues new access token
 */
export const refreshToken = async (req, res) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  const tokenHash = hashToken(token);

  // Find user with this refresh token
  const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash });
  if (!user) {
    // Token reuse or invalid token
    clearRefreshTokenCookie(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  // Find the stored token entry
  const stored = user.refreshTokens.find((rt) => rt.tokenHash === tokenHash);
  if (!stored) {
    // Token not found -- possible reuse or theft. Revoke all sessions for safety.
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    clearRefreshTokenCookie(res);
    return res
      .status(401)
      .json({ message: "Refresh token reuse detected - all sessions revoked" });
  }

  if (stored.expiresAt && stored.expiresAt < new Date()) {
    // expired
    user.refreshTokens = (user.refreshTokens || []).filter(
      (rt) => rt.tokenHash !== tokenHash
    );
    await user.save();
    clearRefreshTokenCookie(res);
    return res.status(401).json({ message: "Refresh token expired" });
  }

  // Detect reuse: if this stored token was already used (rotated), revoke all sessions
  if (stored.used) {
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    clearRefreshTokenCookie(res);
    return res
      .status(401)
      .json({ message: "Refresh token reuse detected - all sessions revoked" });
  }

  // Rotate: mark the used token as used=true and append a new token entry
  stored.used = true;
  const newRefreshPlain = createRefreshToken();
  const newRefreshHash = hashToken(newRefreshPlain);
  user.refreshTokens.push({
    tokenHash: newRefreshHash,
    expiresAt: computeExpiry(REFRESH_TOKEN_EXPIRES_MS),
    used: false,
    meta: { ip: req.ip, ua: req.get("user-agent") },
  });
  await user.save();

  // Issue new access token
  const accessToken = createAccessToken(user._id, { expiresIn: "15m" });
  setAccessTokenCookie(res, accessToken, { maxAge: 15 * 60 * 1000 });
  setRefreshTokenCookie(res, newRefreshPlain, {
    maxAge: REFRESH_TOKEN_EXPIRES_MS,
  });

  res.json({ message: "Token refreshed" });
};

/**
 * Logout: remove refresh token (if present) and clear cookies
 */
export const logout = async (req, res) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (token) {
    const tokenHash = hashToken(token);
    // remove from any user that has it
    await User.updateMany({}, { $pull: { refreshTokens: { tokenHash } } });
  }
  clearRefreshTokenCookie(res);
  // also clear access cookie
  res.clearCookie("jwt", { path: "/" });
  res.json({ message: "Logged out" });
};
