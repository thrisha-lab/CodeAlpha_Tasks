const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route  GET /api/notifications?page=&limit=
 * @desc   The requester's notifications, newest first, with unread count.
 * @access Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const filter = { recipient: req.user._id };
  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name username avatar')
    .populate('post', 'content image')
    .populate('comment', 'text');

  const unreadCount = await Notification.countDocuments({ ...filter, read: false });

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      total,
      hasMore: page * limit < total,
    },
  });
});

/**
 * @route  GET /api/notifications/unread-count
 * @desc   Badge count for the navbar (polled by the client).
 * @access Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ success: true, data: { count } });
});

/**
 * @route  PUT /api/notifications/read-all
 * @desc   Mark all of the requester's notifications as read.
 * @access Private
 */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read', data: { updated: result.modifiedCount } });
});

/**
 * @route  PUT /api/notifications/:id/read
 * @desc   Mark a single notification as read (owner only).
 * @access Private
 */
const markRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateOne(
    { _id: req.params.id, recipient: req.user._id },
    { read: true }
  );
  if (result.matchedCount === 0) throw new ApiError(404, 'Notification not found');
  res.json({ success: true, message: 'Notification marked as read' });
});

module.exports = { getNotifications, getUnreadCount, markAllRead, markRead };
