/**
 * Wraps async route handlers so rejected promises are forwarded
 * to Express' central error handler (no try/catch noise).
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
