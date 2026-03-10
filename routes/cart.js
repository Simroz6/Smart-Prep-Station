const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes are protected
router.use(protect);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/items', addToCart);

router.put('/items/:itemId', updateCartItem);

router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
