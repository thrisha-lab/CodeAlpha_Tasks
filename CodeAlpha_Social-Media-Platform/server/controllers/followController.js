const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification, deleteNotification } = require('../services/notificationService');

/**
 * @route  POST /api/follows/:userId
 * @desc   Follow a user. Rejects self-follow and duplicate follows.
 * @access Private
 */
const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, 'Invalid user id');
  if (userId === String(req.user._id)) throw new ApiError(400, 'You cannot follow yourself');

  const target = await User.findById(userId);
  if (!target) throw new ApiError(404, 'User not found');

  const existing = await Follow.findOne({ follower: req.user._id, following: userId });
  if (existing) throw new ApiError(409, 'You are already following this user');

  await Follow.create({ follower: req.user._id, following: userId });
  await Promise.all([
    User.updateOne({ _id: req.user._id }, { $inc: { followingCount: 1 } }),
    User.updateOne({ _id: userId }, { $inc: { followersCount: 1 } }),
  ]);
  await createNotification({ recipientId: target._id, senderId: req.user._id, type: 'follow' });

  res.json({
    success: true,
    message: `You are now following @${target.username}`,
    data: { following: true, followersCount: target.followersCount + 1 },
  });
});

/**
 * @route  DELETE /api/follows/:userId
 * @desc   Unfollow a previously followed user (idempotent state, explicit
 *         error if the relationship does not exist).
 * @access Private
 */
const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, 'Invalid user id');

  const target = await User.findById(userId);
  if (!target) throw new ApiError(404, 'User not found');

  const result = await Follow.deleteOne({ follower: req.user._id, following: userId });
  if (result.deletedCount === 0) throw new ApiError(404, 'You are not following this user');

  await Promise.all([
    User.updateOne({ _id: req.user._id }, { $inc: { followingCount: -1 } }),
    User.updateOne({ _id: userId }, { $inc: { followersCount: -1 } }),
  ]);
  await deleteNotification({ recipientId: target._id, senderId: req.user._id, type: 'follow' });

  res.json({
    success: true,
    message: `Unfollowed @${target.username}`,
    data: { following: false, followersCount: Math.max(0, target.followersCount - 1) },
  });
});

module.exports = { followUser, unfollowUser };
