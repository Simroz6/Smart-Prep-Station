const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin routes
router.post('/', protect, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required')
], createCategory);

router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
