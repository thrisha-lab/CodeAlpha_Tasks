const jwt = require('jsonwebtoken');

/** Signs a JWT for the given user id. */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || 'dev_only_secret_change_me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = generateToken;
