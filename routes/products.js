const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  addReview,
  getCategories,
  getFeaturedProducts
} = require('../controllers/productController');
const { protect, authorize, isSellerOrAdmin } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, authorize('seller', 'admin'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a positive number'),
  body('category').notEmpty().withMessage('Category is required')
], createProduct);

router.put('/:id', protect, isSellerOrAdmin, updateProduct);
router.delete('/:id', protect, isSellerOrAdmin, deleteProduct);

// Seller routes
router.get('/seller/my-products', protect, authorize('seller', 'admin'), getSellerProducts);

// Review routes
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required')
], addReview);

module.exports = router;
