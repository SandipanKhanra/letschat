import jwt from "jsonwebtoken";
import crypto from "crypto";

const COOKIE_NAME = "jwt";
const DEFAULT_ACCESS_EXPIRES = "15m"; // short-lived access token by default
const LEGACY_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms (kept for backward compatibility)

export function createAccessToken(
  userId,
  {
    expiresIn = DEFAULT_ACCESS_EXPIRES,
    secret = process.env.JWT_SECRET,
    algorithm = "HS256",
  } = {}
) {
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  // Keep payload minimal and use `sub` claim for subject
  const payload = { sub: String(userId) };
  return jwt.sign(payload, secret, { expiresIn, algorithm });
}

export function setAccessTokenCookie(
  res,
  token,
  {
    name = COOKIE_NAME,
    maxAge = LEGACY_COOKIE_MAX_AGE,
    httpOnly = true,
    secure = process.env.NODE_ENV === "production",
    sameSite = "lax",
    path = "/",
  } = {}
) {
  if (!res || typeof res.cookie !== "function") {
    throw new Error(
      "Express response object with cookie() is required to set token cookie"
    );
  }

  const cookieOptions = { httpOnly, secure, sameSite, maxAge, path };
  res.cookie(name, token, cookieOptions);
}

export function generateToken(userId, res, { expiresIn = "7d" } = {}) {
  try {
    const token = createAccessToken(userId, { expiresIn });
    setAccessTokenCookie(res, token, { maxAge: LEGACY_COOKIE_MAX_AGE });
    return token;
  } catch (error) {
    throw error;
  }
}

/**
 * Refresh token helpers
 */
export function createRefreshToken({ size = 64 } = {}) {
  // Return a URL-safe base64 token
  return crypto.randomBytes(size).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function setRefreshTokenCookie(
  res,
  token,
  {
    name = "refresh_token",
    maxAge = 7 * 24 * 60 * 60 * 1000,
    httpOnly = true,
    secure = process.env.NODE_ENV === "production",
    sameSite = "lax",
    path = "/",
  } = {}
) {
  if (!res || typeof res.cookie !== "function") {
    throw new Error(
      "Express response object with cookie() is required to set token cookie"
    );
  }

  res.cookie(name, token, { httpOnly, secure, sameSite, maxAge, path });
}

export function clearRefreshTokenCookie(
  res,
  { name = "refresh_token", path = "/" } = {}
) {
  if (!res || typeof res.clearCookie !== "function") {
    throw new Error(
      "Express response object with clearCookie() is required to clear token cookie"
    );
  }
  res.clearCookie(name, { path });
}

export default { createAccessToken, setAccessTokenCookie, generateToken };
