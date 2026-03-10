const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getMe, 
  updateProfile, 
  updatePassword, 
  requestSellerRole, 
  logout, 
  getSellerById, 
  getSellerProducts, 
  getAllSellers,
  getShippingData,
  updateArea
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/shipping-data', getShippingData);

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.get('/logout', protect, logout);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/area', protect, updateArea);
router.put('/password', protect, updatePassword);
router.post('/request-seller', protect, requestSellerRole);

// Public seller routes
router.get('/sellers', getAllSellers);
router.get('/sellers/:id', getSellerById);
router.get('/sellers/:id/products', getSellerProducts);

module.exports = router;
