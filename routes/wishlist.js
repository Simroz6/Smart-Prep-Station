const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');

// All routes require authentication
router.use(auth.protect);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Add item to wishlist
router.post('/', wishlistController.addToWishlist);

// Remove item from wishlist
router.delete('/:productId', wishlistController.removeFromWishlist);

// Clear wishlist
router.delete('/', wishlistController.clearWishlist);

module.exports = router;
