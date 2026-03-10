const express = require('express');
const router = express.Router();
const {
  requestAffiliate,
  getAffiliateDashboard,
  verifyReferralCode,
  getAllAffiliates,
  getPendingRequests,
  approveAffiliate,
  rejectAffiliate,
  markCommissionPaid
} = require('../controllers/affiliateController');
const { protect, isAdmin, isSellerOrAdmin } = require('../middleware/auth');

// Public route to verify referral code
router.get('/verify/:code', verifyReferralCode);

// Protected routes
router.get('/dashboard', protect, getAffiliateDashboard);
router.post('/request', protect, requestAffiliate);

// Seller/Admin routes
router.get('/affiliates', protect, isSellerOrAdmin, getAllAffiliates);
router.get('/requests', protect, isSellerOrAdmin, getPendingRequests);
router.put('/approve/:id', protect, isSellerOrAdmin, approveAffiliate);
router.put('/reject/:id', protect, isSellerOrAdmin, rejectAffiliate);
router.put('/commission/:userId/:commissionId/paid', protect, isSellerOrAdmin, markCommissionPaid);

module.exports = router;
