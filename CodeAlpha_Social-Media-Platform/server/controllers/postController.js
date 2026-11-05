const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validatePost } = require('../utils/validators');
const { createNotification, deleteNotification } = require('../services/notificationService');

const AUTHOR_FIELDS = 'name username avatar';

/**
 * Batch-loads the requester's likes for a list of posts and returns plain
 * objects with a `likedByMe` boolean (avoids N+1 queries in feeds).
 */
const attachLikeState = async (posts, userId) => {
  const docs = posts.map((p) => p.toObject());
  if (!docs.length || !userId) return docs.map((p) => ({ ...p, likedByMe: false }));

  const likes = await Like.find({ user: userId, post: { $in: docs.map((p) => p._id) } }).select('post');
  const likedSet = new Set(likes.map((l) => String(l.post)));
  return docs.map((p) => ({ ...p, likedByMe: likedSet.has(String(p._id)) }));
};

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  return { page, limit };
};

/**
 * @route  GET /api/posts?page=&limit=
 * @desc   Global feed — latest posts first, with likedByMe state.
 * @access Private
 */
const getFeed = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const total = await Post.countDocuments({});
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', AUTHOR_FIELDS);

  res.json({
    success: true,
    data: {
      posts: await attachLikeState(posts, req.user._id),
      page,
      totalPages: Math.ceil(total / limit) || 1,
      total,
      hasMore: page * limit < total,
    },
  });
});

/**
 * @route  POST /api/posts  (multipart/form-data, optional `image` file)
 * @desc   Create a post (text + optional image upload or https image URL).
 * @access Private
 */
const createPost = asyncHandler(async (req, res) => {
  const content = validatePost(req.body);

  let image = '';
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
  } else if (req.body.image && /^https?:\/\/\S+$/i.test(String(req.body.image))) {
    image = String(req.body.image).trim();
  }

  const post = await Post.create({ author: req.user._id, content, image });
  await User.updateOne({ _id: req.user._id }, { $inc: { postsCount: 1 } });
  await post.populate('author', AUTHOR_FIELDS);

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: { post: { ...post.toObject(), likedByMe: false } },
  });
});

/**
 * @route  GET /api/posts/:id
 * @desc   Single post with author + likedByMe state.
 * @access Private
 */
const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ success: true, data: { post: (await attachLikeState([post], req.user._id))[0] } });
});

/**
 * @route  PUT /api/posts/:id
 * @desc   Edit own post's content. Authorization: author only.
 * @access Private
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!post.author.equals(req.user._id)) {
    throw new ApiError(403, 'You are not allowed to edit this post');
  }

  post.content = validatePost(req.body);
  await post.save();
  await post.populate('author', AUTHOR_FIELDS);

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: { post: (await attachLikeState([post], req.user._id))[0] },
  });
});

/**
 * @route  DELETE /api/posts/:id
 * @desc   Delete own post plus its likes, comments, notifications and file.
 *         Authorization: author only.
 * @access Private
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!post.author.equals(req.user._id)) {
    throw new ApiError(403, 'You are not allowed to delete this post');
  }

  await Promise.all([
    Like.deleteMany({ post: post._id }),
    Comment.deleteMany({ post: post._id }),
    Notification.deleteMany({ post: post._id }),
  ]);
  await Post.deleteOne({ _id: post._id });
  await User.updateOne({ _id: post.author }, { $inc: { postsCount: -1 } });

  if (post.image && post.image.startsWith('/uploads/')) {
    fs.promises.unlink(path.join(__dirname, '..', post.image)).catch(() => {});
  }

  res.json({ success: true, message: 'Post deleted successfully' });
});

/**
 * @route  POST /api/posts/:id/like
 * @desc   Like a post. Duplicate likes are prevented (unique index + pre-check).
 * @access Private
 */
const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  const existing = await Like.exists({ user: req.user._id, post: post._id });
  if (existing) {
    return res.json({ success: true, message: 'Post already liked', data: { liked: true, likeCount: post.likeCount } });
  }

  await Like.create({ user: req.user._id, post: post._id });
  post.likeCount += 1;
  await post.save();

  await createNotification({ recipientId: post.author, senderId: req.user._id, type: 'like', postId: post._id });

  res.json({ success: true, message: 'Post liked', data: { liked: true, likeCount: post.likeCount } });
});

/**
 * @route  DELETE /api/posts/:id/like
 * @desc   Unlike a previously liked post (idempotent).
 * @access Private
 */
const unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  const result = await Like.deleteOne({ user: req.user._id, post: post._id });
  if (result.deletedCount > 0) {
    post.likeCount = Math.max(0, post.likeCount - 1);
    await post.save();
    await deleteNotification({ recipientId: post.author, senderId: req.user._id, type: 'like', postId: post._id });
  }

  res.json({ success: true, message: 'Post unliked', data: { liked: false, likeCount: post.likeCount } });
});

/**
 * @route  GET /api/posts/:id/likes
 * @desc   List the users who liked a post (with requester follow state).
 * @access Private
 */
const getPostLikes = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  const likes = await Like.find({ post: post._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'user', select: '-password' });

  const users = await Promise.all(
    likes.map(async (l) => ({
      ...l.user.toJSON(),
      isFollowing: !!(await Follow.exists({ follower: req.user._id, following: l.user._id })),
      isSelf: l.user._id.equals(req.user._id),
    }))
  );

  res.json({ success: true, data: { users, total: users.length } });
});

module.exports = {
  attachLikeState,
  getFeed,
  createPost,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes,
};
