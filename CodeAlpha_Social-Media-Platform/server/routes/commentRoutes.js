const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { createComment, deleteComment } = require('../controllers/commentController');

// Creating a comment: POST /api/comments { postId, text }
router.post('/', protect, createComment);

// Deleting own comment: DELETE /api/comments/:id
router.delete('/:id', protect, deleteComment);

module.exports = router;
