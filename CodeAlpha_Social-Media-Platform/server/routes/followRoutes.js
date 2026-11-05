const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { followUser, unfollowUser } = require('../controllers/followController');

// POST   /api/follows/:userId -> follow
// DELETE /api/follows/:userId -> unfollow
router.post('/:userId', protect, followUser);
router.delete('/:userId', protect, unfollowUser);

module.exports = router;
