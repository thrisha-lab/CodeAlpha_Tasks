const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validateProfileUpdate } = require('../utils/validators');
const { attachLikeState } = require('./postController');

const findUserByUsernameOr404 = async (username) => {
  const user = await User.findOne({ username: String(username).toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

/** Adds isFollowing / isSelf flags (relative to the requester) to a user doc. */
const withSocialState = async (userDoc, requesterId) => {
  const isFollowing = !userDoc._id.equals(requesterId)
    ? !!(await Follow.exists({ follower: requesterId, following: userDoc._id }))
    : false;
  return { ...userDoc.toJSON(), isFollowing, isSelf: userDoc._id.equals(requesterId) };
};

/**
 * @route  PUT /api/users/me
 * @desc   Update the authenticated user's profile (multipart: optional avatar file).
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  const clean = validateProfileUpdate(req.body);

  if (clean.username && clean.username !== user.username) {
    const taken = await User.findOne({ username: clean.username });
    if (taken) throw new ApiError(409, `Username "${clean.username}" is already taken`);
  }
  if (clean.email && clean.email !== user.email) {
    const taken = await User.findOne({ email: clean.email });
    if (taken) throw new ApiError(409, `Email "${clean.email}" is already registered`);
  }

  if (req.file) {
    // Best-effort cleanup of a previous locally-stored avatar.
    if (user.avatar && user.avatar.startsWith('/uploads/')) {
      fs.promises.unlink(path.join(__dirname, '..', user.avatar)).catch(() => {});
    }
    user.avatar = `/uploads/${req.file.filename}`;
  }

  Object.assign(user, clean);
  await user.save();

  res.json({ success: true, message: 'Profile updated successfully', data: { user } });
});

/**
 * @route  GET /api/users/search?q=
 * @desc   Search users by name or username (case-insensitive, max 10).
 * @access Private
 */
const searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: { users: [] } });

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const users = await User.find({ $or: [{ username: regex }, { name: regex }] })
    .sort({ followersCount: -1, name: 1 })
    .limit(10);

  const results = await Promise.all(users.map((u) => withSocialState(u, req.user._id)));
  res.json({ success: true, data: { users: results } });
});

/**
 * @route  GET /api/users/username/:username
 * @desc   Public profile: user + counters + requester's follow state.
 * @access Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await findUserByUsernameOr404(req.params.username);
  const isFollowing = !!(await Follow.exists({ follower: req.user._id, following: user._id }));
  res.json({
    success: true,
    data: { user, isFollowing, isSelf: user._id.equals(req.user._id) },
  });
});

/**
 * @route  GET /api/users/username/:username/posts
 * @desc   All posts authored by the given user (newest first).
 * @access Private
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const user = await findUserByUsernameOr404(req.params.username);
  const posts = await Post.find({ author: user._id })
    .sort({ createdAt: -1 })
    .populate('author', 'name username avatar');
  res.json({
    success: true,
    data: { posts: await attachLikeState(posts, req.user._id), total: posts.length },
  });
});

/**
 * @route  GET /api/users/username/:username/followers
 * @desc   Users who follow the given user.
 * @access Private
 */
const getFollowers = asyncHandler(async (req, res) => {
  const user = await findUserByUsernameOr404(req.params.username);
  const follows = await Follow.find({ following: user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'follower', select: '-password' });

  const users = await Promise.all(
    follows.map((f) => withSocialState(f.follower, req.user._id))
  );
  res.json({ success: true, data: { users, total: users.length } });
});

/**
 * @route  GET /api/users/username/:username/following
 * @desc   Users the given user follows.
 * @access Private
 */
const getFollowing = asyncHandler(async (req, res) => {
  const user = await findUserByUsernameOr404(req.params.username);
  const follows = await Follow.find({ follower: user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'following', select: '-password' });

  const users = await Promise.all(
    follows.map((f) => withSocialState(f.following, req.user._id))
  );
  res.json({ success: true, data: { users, total: users.length } });
});

module.exports = { updateProfile, searchUsers, getProfile, getUserPosts, getFollowers, getFollowing };
