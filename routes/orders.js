const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  getSellerOrders,
  updateSellerOrderStatus,
  getSellerRevenue
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Seller routes - MUST be defined BEFORE /:id routes
router.get('/seller', protect, authorize('seller', 'admin'), getSellerOrders);
router.get('/seller/revenue', protect, authorize('seller', 'admin'), getSellerRevenue);
router.put('/:orderId/seller/status', protect, authorize('seller', 'admin'), [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'])
    .withMessage('Invalid status')
], updateSellerOrderStatus);

// Customer/Seller routes (both can place orders)
router.post('/', protect, authorize('customer', 'seller', 'admin'), [
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.addressLine1').trim().notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone is required')
], createOrder);

router.get('/', protect, authorize('customer', 'seller', 'admin'), getOrders);
router.get('/:id', protect, authorize('customer', 'seller', 'admin'), getOrder);
router.put('/:id/cancel', protect, authorize('customer', 'seller', 'admin'), [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
], cancelOrder);

module.exports = router;
