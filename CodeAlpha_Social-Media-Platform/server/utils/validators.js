const ApiError = require('./ApiError');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Input validation helpers. Each validator throws an ApiError(400) with a
 * user-friendly message on the first invalid field. React escapes output,
 * and Mongoose casts/types values, so this layer focuses on shape + limits.
 */

const validateRegister = ({ name, username, email, password } = {}) => {
  name = (name || '').trim();
  username = (username || '').trim();
  email = (email || '').trim().toLowerCase();

  if (!name) throw new ApiError(400, 'Name is required');
  if (name.length < 2 || name.length > 50) throw new ApiError(400, 'Name must be between 2 and 50 characters');
  if (!username) throw new ApiError(400, 'Username is required');
  if (!USERNAME_RE.test(username))
    throw new ApiError(400, 'Username must be 3-20 characters and contain only letters, numbers and underscores');
  if (!email) throw new ApiError(400, 'Email is required');
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Please provide a valid email address');
  if (!password) throw new ApiError(400, 'Password is required');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters long');
  if (String(password).length > 72) throw new ApiError(400, 'Password must be at most 72 characters long');

  return { name, username: username.toLowerCase(), email, password };
};

/** `email` field doubles as "email or username" for login convenience. */
const validateLogin = ({ email, password } = {}) => {
  const identifier = (email || '').trim().toLowerCase();
  if (!identifier) throw new ApiError(400, 'Email or username is required');
  if (!password) throw new ApiError(400, 'Password is required');
  return { identifier, password };
};

const validateProfileUpdate = ({ name, username, bio, email } = {}) => {
  const clean = {};
  if (name !== undefined) {
    clean.name = String(name).trim();
    if (clean.name.length < 2 || clean.name.length > 50)
      throw new ApiError(400, 'Name must be between 2 and 50 characters');
  }
  if (username !== undefined) {
    clean.username = String(username).trim().toLowerCase();
    if (!USERNAME_RE.test(clean.username))
      throw new ApiError(400, 'Username must be 3-20 characters and contain only letters, numbers and underscores');
  }
  if (bio !== undefined) {
    clean.bio = String(bio).trim();
    if (clean.bio.length > 160) throw new ApiError(400, 'Bio must be at most 160 characters');
  }
  if (email !== undefined) {
    clean.email = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(clean.email)) throw new ApiError(400, 'Please provide a valid email address');
  }
  return clean;
};

const validatePost = ({ content } = {}) => {
  const text = String(content || '').trim();
  if (!text) throw new ApiError(400, 'Post content cannot be empty');
  if (text.length > 1000) throw new ApiError(400, 'Post cannot exceed 1000 characters');
  return text;
};

const validateComment = ({ text } = {}) => {
  const value = String(text || '').trim();
  if (!value) throw new ApiError(400, 'Comment cannot be empty');
  if (value.length > 300) throw new ApiError(400, 'Comment cannot exceed 300 characters');
  return value;
};

module.exports = { validateRegister, validateLogin, validateProfileUpdate, validatePost, validateComment };
