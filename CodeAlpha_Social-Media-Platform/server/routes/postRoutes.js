const router = require('express').Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  getFeed,
  createPost,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes,
} = require('../controllers/postController');
const { getPostComments } = require('../controllers/commentController');

router
  .route('/')
  .get(protect, getFeed)
  .post(protect, upload.single('image'), createPost);

router.get('/:id/likes', protect, getPostLikes);
router.get('/:postId/comments', protect, getPostComments);

router
  .route('/:id')
  .get(protect, getPost)
  .put(protect, updatePost)
  .delete(protect, deletePost);

router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);

module.exports = router;
