import { verifyAccessToken } from "../lib/utils.js";

export const protectedRoute = async (req, res, next) => {
  try {
    const token = req?.cookies?.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.userId = payload.userId;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    console.error("Error in protectedRoute middleware:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
