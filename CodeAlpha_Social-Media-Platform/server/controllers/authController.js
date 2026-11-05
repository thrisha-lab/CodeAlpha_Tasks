const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const { validateRegister, validateLogin } = require('../utils/validators');

/**
 * @route  POST /api/auth/register
 * @desc   Create a new account and return a JWT.
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const clean = validateRegister(req.body);

  const usernameTaken = await User.findOne({ username: clean.username });
  if (usernameTaken) throw new ApiError(409, `Username "${clean.username}" is already taken`);

  const emailTaken = await User.findOne({ email: clean.email });
  if (emailTaken) throw new ApiError(409, `Email "${clean.email}" is already registered`);

  const user = await User.create(clean); // password hashed by pre-save hook
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Welcome to Connectify!',
    data: { user, token },
  });
});

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate with email OR username + password, return JWT.
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = validateLogin(req.body);

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials. Please check your email/username and password');
  }

  const token = generateToken(user._id);
  res.json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    data: { user, token },
  });
});

/**
 * @route  GET /api/auth/me
 * @desc   Return the currently authenticated user (with live counters).
 * @access Private
 */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

/**
 * @route  POST /api/auth/logout
 * @desc   Stateless JWT logout — the client discards its token. This endpoint
 *         exists so clients have an explicit API call for the logout action.
 * @access Private
 */
const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Please remove the token on the client side',
  });
});

module.exports = { register, login, me, logout };
