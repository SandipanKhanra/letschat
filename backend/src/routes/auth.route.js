import express from "express";
import {
  signup,
  login,
  refreshToken,
  logout,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  signupLimiter,
  loginLimiter,
  refreshLimiter,
} from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refreshToken);
router.post("/logout", logout);
router.put("/update-profile", protectedRoute, updateProfile);
router.get("/check", protectedRoute, (req, res) => {
  res.json({ message: "Authenticated", userId: req.userId });
});

export default router;
