const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/', auth.protect, reviewController.createReview);
router.put('/:id', auth.protect, reviewController.updateReview);
router.delete('/:id', auth.protect, reviewController.deleteReview);
router.post('/:id/helpful', auth.protect, reviewController.markHelpful);

module.exports = router;
