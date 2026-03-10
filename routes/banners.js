const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const bannerController = require('../controllers/bannerController');

// Public route - get active banners
router.get('/active', bannerController.getActiveBanners);

// Admin routes
router.get('/', protect, isAdmin, bannerController.getBanners);
router.post('/', protect, isAdmin, bannerController.createBanner);
router.put('/:id', protect, isAdmin, bannerController.updateBanner);
router.delete('/:id', protect, isAdmin, bannerController.deleteBanner);

module.exports = router;
