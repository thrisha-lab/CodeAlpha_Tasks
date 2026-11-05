const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/comments', require('./commentRoutes'));
router.use('/follows', require('./followRoutes'));
router.use('/notifications', require('./notificationRoutes'));

module.exports = router;
