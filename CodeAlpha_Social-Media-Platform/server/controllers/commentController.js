const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validateComment } = require('../utils/validators');
const { createNotification } = require('../services/notificationService');

const AUTHOR_FIELDS = 'name username avatar';

/**
 * @route  POST /api/comments  { postId, text }
 * @desc   Add a comment to a post and notify the post author.
 * @access Private
 */
const createComment = asyncHandler(async (req, res) => {
  const text = validateComment(req.body);
  const { postId } = req.body;

  if (!postId) throw new ApiError(400, 'postId is required');
  if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, 'Invalid post id');

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found');

  const comment = await Comment.create({ post: post._id, author: req.user._id, text });
  post.commentCount += 1;
  await post.save();

  await comment.populate('author', AUTHOR_FIELDS);
  await createNotification({
    recipientId: post.author,
    senderId: req.user._id,
    type: 'comment',
    postId: post._id,
    commentId: comment._id,
  });

  res.status(201).json({ success: true, message: 'Comment added successfully', data: { comment } });
});

/**
 * @route  GET /api/posts/:postId/comments
 * @desc   List comments of a post, oldest first (conversation order).
 * @access Private
 */
const getPostComments = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, 'Post not found');

  const comments = await Comment.find({ post: post._id })
    .sort({ createdAt: 1 })
    .populate('author', AUTHOR_FIELDS);

  res.json({ success: true, data: { comments, total: comments.length } });
});

/**
 * @route  DELETE /api/comments/:id
 * @desc   Delete own comment. Authorization: comment author only.
 * @access Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (!comment.author.equals(req.user._id)) {
    throw new ApiError(403, 'You can only delete your own comments');
  }

  await Comment.deleteOne({ _id: comment._id });
  await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });
  await Notification.deleteMany({ comment: comment._id });

  res.json({ success: true, message: 'Comment deleted successfully' });
});

module.exports = { createComment, getPostComments, deleteComment };
