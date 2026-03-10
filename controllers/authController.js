const User = require('../models/User');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const shippingData = require('../utils/shippingData');

// @desc    Get shipping areas and charges
// @route   GET /api/auth/shipping-data
// @access  Public
exports.getShippingData = (req, res, next) => {
  try {
    console.log('Fetching shipping data...');
    res.status(200).json({
      success: true,
      data: shippingData
    });
  } catch (error) {
    console.error('Error in getShippingData:', error);
    next(error);
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, area, postalCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    let userRole = 'customer';
    let sellerRequestStatus = 'none';

    if (role === 'admin') {
      return next(new ErrorResponse('Invalid role selection', 400));
    }
    // If role is 'seller', set initial role to 'customer' and mark sellerRequest as 'pending'
    if (role === 'seller') {
      userRole = 'customer';
      sellerRequestStatus = 'pending';
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      area,
      postalCode,
      sellerRequest: {
        status: sellerRequestStatus,
        ...(sellerRequestStatus === 'pending' && { requestedAt: new Date() })
      }
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if account is active
    if (!user.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401));
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      avatar: req.body.avatar,
      area: req.body.area
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 400));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Request seller role
// @route   POST /api/auth/request-seller
// @access  Private
exports.requestSellerRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.role === 'seller') {
      return next(new ErrorResponse('You are already a seller', 400));
    }

    if (user.sellerRequest && user.sellerRequest.status === 'pending') {
      return next(new ErrorResponse('Seller request is already pending', 400));
    }

    user.sellerRequest = {
      status: 'pending',
      requestedAt: new Date()
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Seller request submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get all sellers (public)
// @route   GET /api/auth/sellers
// @access  Public
exports.getAllSellers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const sellers = await User.find({ role: 'seller' })
      .select('name avatar bio createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'seller' });

    // Get stats for each seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const productCount = await Product.countDocuments({ seller: seller._id, isActive: true });
        
        const products = await Product.find({ seller: seller._id, isActive: true })
          .select('rating');
        
        let totalRating = 0;
        let totalReviews = 0;
        
        products.forEach(product => {
          if (product.rating && product.rating.count > 0) {
            totalRating += product.rating.average * product.rating.count;
            totalReviews += product.rating.count;
          }
        });
        
        const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

        return {
          _id: seller._id,
          name: seller.name,
          avatar: seller.avatar,
          bio: seller.bio || '',
          createdAt: seller.createdAt,
          productCount,
          totalReviews,
          averageRating: parseFloat(averageRating)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        sellers: sellersWithStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller by ID (public)
// @route   GET /api/auth/sellers/:id
// @access  Public
exports.getSellerById = async (req, res, next) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller) {
      return next(new ErrorResponse('Seller not found', 404));
    }

    // Only allow users with role: 'seller'
    if (seller.role !== 'seller') {
      return next(new ErrorResponse('Seller not found', 404));
    }
    
    // Get seller stats
    const productCount = await Product.countDocuments({ seller: seller._id, isActive: true });
    
    // Get seller reviews/ratings (from products)
    const products = await Product.find({ seller: seller._id, isActive: true })
      .select('rating reviews');
    
    let totalRating = 0;
    let totalReviews = 0;
    
    products.forEach(product => {
      if (product.rating && product.rating.count > 0) {
        totalRating += product.rating.average * product.rating.count;
        totalReviews += product.rating.count;
      }
    });
    
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        _id: seller._id,
        name: seller.name,
        email: seller.email,
        avatar: seller.avatar,
        bio: seller.bio || '',
        createdAt: seller.createdAt,
        productCount,
        totalReviews,
        averageRating: parseFloat(averageRating)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller's products (public)
// @route   GET /api/auth/sellers/:id/products
// @access  Public
exports.getSellerProducts = async (req, res, next) => {
  try {
    const seller = await User.findOne({ _id: req.params.id, role: 'seller' });

    if (!seller) {
      return next(new ErrorResponse('Seller not found', 404));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const products = await Product.find({ 
      seller: seller._id, 
      isActive: true 
    })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments({ 
      seller: seller._id, 
      isActive: true 
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user area
// @route   PUT /api/auth/area
// @access  Private
exports.updateArea = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { area: req.body.area },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get token, model, and cookie options
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        area: user.area
      }
    });
};
