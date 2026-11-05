const Notification = require('../models/Notification');

/**
 * Central place that creates/removes social notifications.
 * Self-actions (user acting on their own content) never notify.
 */

const createNotification = async ({ recipientId, senderId, type, postId = null, commentId = null }) => {
  if (!recipientId || String(recipientId) === String(senderId)) return null;
  return Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    post: postId,
    comment: commentId,
  });
};

/** Removes the matching notification when an action is undone (unlike/unfollow). */
const deleteNotification = async ({ recipientId, senderId, type, postId = null }) => {
  if (!recipientId) return;
  await Notification.deleteOne({ recipient: recipientId, sender: senderId, type, post: postId });
};

module.exports = { createNotification, deleteNotification };
