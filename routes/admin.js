const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getSellerRequests,
  reviewSellerRequest,
  getAllProducts,
  getAllOrders,
  getSellerAnalytics
} = require('../controllers/adminController');
const { protect, authorize, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);

// Seller requests
router.get('/seller-requests', getSellerRequests);
router.put('/seller-requests/:id', reviewSellerRequest);

// Products management
router.get('/products', getAllProducts);

// Orders management
router.get('/orders', getAllOrders);

// Seller analytics
router.get('/seller-analytics', getSellerAnalytics);

module.exports = router;
