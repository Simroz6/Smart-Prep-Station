const User = require('../models/User');
const Order = require('../models/Order');

// Request to become an affiliate
exports.requestAffiliate = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.isAffiliate) {
      return res.status(400).json({
        success: false,
        message: 'You are already an affiliate'
      });
    }

    if (user.affiliateRequest && user.affiliateRequest.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending affiliate request'
      });
    }

    user.affiliateRequest = {
      status: 'pending',
      requestedAt: new Date()
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Affiliate request submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get affiliate dashboard data
exports.getAffiliateDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'You are not an affiliate'
      });
    }

    // Get total referral count
    const referralCount = await Order.countDocuments({
      referredByAffiliate: user._id
    });

    // Sort commissions by date (newest first)
    const sortedCommissions = [...user.affiliateCommissions].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        affiliateEarnings: user.affiliateEarnings,
        totalReferrals: referralCount,
        affiliateCommissions: sortedCommissions,
        affiliateRequest: user.affiliateRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify referral code
exports.verifyReferralCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const affiliate = await User.findOne({ 
      referralCode: code,
      isAffiliate: true
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        affiliateName: affiliate.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all affiliates (admin)
exports.getAllAffiliates = async (req, res, next) => {
  try {
    const affiliates = await User.find({ isAffiliate: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: affiliates
    });
  } catch (error) {
    next(error);
  }
};

// Get pending affiliate requests (admin)
exports.getPendingRequests = async (req, res, next) => {
  try {
    const requests = await User.find({
      'affiliateRequest.status': 'pending'
    }).select('-password');

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// Approve affiliate request (admin)
exports.approveAffiliate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.affiliateRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending request found for this user'
      });
    }

    // Generate referral code
    user.generateReferralCode();
    user.isAffiliate = true;
    user.affiliateRequest.status = 'approved';
    user.affiliateRequest.reviewedAt = new Date();
    user.affiliateRequest.reviewedBy = req.user.id;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Affiliate request approved',
      data: {
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reject affiliate request (admin)
exports.rejectAffiliate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.affiliateRequest.status = 'rejected';
    user.affiliateRequest.reviewedAt = new Date();
    user.affiliateRequest.reviewedBy = req.user.id;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Affiliate request rejected'
    });
  } catch (error) {
    next(error);
  }
};

// Mark affiliate commission as paid (admin)
exports.markCommissionPaid = async (req, res, next) => {
  try {
    const { commissionId, userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const commission = user.affiliateCommissions.id(commissionId);
    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    commission.status = 'paid';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Commission marked as paid'
    });
  } catch (error) {
    next(error);
  }
};
