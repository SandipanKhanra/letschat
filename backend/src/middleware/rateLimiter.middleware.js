import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Signup limiter: strict rate limiting (3 attempts per 15 minutes per IP)
 */
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // 3 requests per windowMs
  message: "Too many signup attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email + IP (using ipKeyGenerator for proper IPv6 support)
    const ip = ipKeyGenerator(req);
    return `${req.body?.email || ""}-${ip}`;
  },
  skip: (req) => process.env.NODE_ENV !== "production",
});

/**
 * Login limiter: moderate rate limiting (10 attempts per 15 minutes per IP)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email + IP (using ipKeyGenerator for proper IPv6 support)
    const ip = ipKeyGenerator(req);
    return `${req.body?.email || ""}-${ip}`;
  },
  skip: (req) => process.env.NODE_ENV !== "production",
});

/**
 * Refresh token limiter: lenient rate limiting (20 attempts per 5 minutes per IP)
 */
export const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // 20 requests per windowMs
  message: "Too many token refresh attempts",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator, // Use ipKeyGenerator for proper IPv6 support
});

export default {
  signupLimiter,
  loginLimiter,
  refreshLimiter,
};
