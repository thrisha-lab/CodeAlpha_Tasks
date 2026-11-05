const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} = require('../controllers/notificationController');

// Static segments BEFORE /:id/read to avoid param collisions
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/read-all', protect, markAllRead);
router.put('/:id/read', protect, markRead);

module.exports = router;
