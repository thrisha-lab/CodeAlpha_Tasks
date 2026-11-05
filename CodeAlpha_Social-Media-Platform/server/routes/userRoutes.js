const router = require('express').Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  updateProfile,
  searchUsers,
  getProfile,
  getUserPosts,
  getFollowers,
  getFollowing,
} = require('../controllers/userController');

// Static segments first so they never collide with /username/:username
router.put('/me', protect, upload.single('avatar'), updateProfile);
router.get('/search', protect, searchUsers);

router.get('/username/:username', protect, getProfile);
router.get('/username/:username/posts', protect, getUserPosts);
router.get('/username/:username/followers', protect, getFollowers);
router.get('/username/:username/following', protect, getFollowing);

module.exports = router;
