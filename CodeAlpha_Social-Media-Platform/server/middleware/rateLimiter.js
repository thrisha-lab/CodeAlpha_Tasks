const rateLimit = require('express-rate-limit');

/** Stricter limit for auth endpoints (brute-force protection). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes' },
});

/** General API limit (generous; protects against runaway clients). */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly' },
});

module.exports = { authLimiter, apiLimiter };
