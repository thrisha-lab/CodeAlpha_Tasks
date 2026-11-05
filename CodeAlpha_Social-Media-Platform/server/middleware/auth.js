const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware. Expects `Authorization: Bearer <token>`.
 * Verifies the JWT, loads the user, and attaches it to req.user.
 * Rejects tokens for users that no longer exist.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required. Please log in');
  }

  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_only_secret_change_me');
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your session has expired. Please log in again');
    }
    throw new ApiError(401, 'Invalid authentication token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'The user belonging to this token no longer exists');

  req.user = user;
  next();
});

module.exports = { protect };
