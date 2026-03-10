const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalCategories,
      sellerRequests,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Category.countDocuments(),
      User.countDocuments({ 'sellerRequest.status': 'pending' }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('customer', 'name email')
    ]);

    // Calculate revenue
    const ordersWithRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = ordersWithRevenue.length > 0 ? ordersWithRevenue[0].total : 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          title: '$product.title',
          totalSold: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: totalUsers,
          products: totalProducts,
          orders: totalOrders,
          categories: totalCategories,
          pendingSellerRequests: sellerRequests
        },
        revenue: {
          total: totalRevenue
        },
        ordersByStatus,
        topProducts,
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['customer', 'seller', 'admin'].includes(role)) {
      return next(new ErrorResponse('Invalid role', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate/Activate user
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: user.isActive ? 'User activated' : 'User deactivated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all seller requests
// @route   GET /api/admin/seller-requests
// @access  Private/Admin
exports.getSellerRequests = async (req, res, next) => {
  try {
    const requests = await User.find({
      'sellerRequest.status': 'pending'
    }).select('name email sellerRequest');

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject seller request
// @route   PUT /api/admin/seller-requests/:id
// @access  Private/Admin
exports.reviewSellerRequest = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (user.sellerRequest.status !== 'pending') {
      return next(new ErrorResponse('Request already processed', 400));
    }

    user.sellerRequest.status = status;
    user.sellerRequest.reviewedAt = new Date();
    user.sellerRequest.reviewedBy = req.user.id;

    if (status === 'approved') {
      user.role = 'seller';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Seller request ${status}`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, seller, category, search, isActive } = req.query;

    const query = {};
    if (seller) query.seller = seller;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('seller', 'name email')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller analytics
// @route   GET /api/admin/seller-analytics
// @access  Private/Admin
exports.getSellerAnalytics = async (req, res, next) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('_id name email');

    const sellerAnalytics = await Promise.all(
      sellers.map(async (seller) => {
        const productCount = await Product.countDocuments({ seller: seller._id });

        const orders = await Order.find({ 'items.seller': seller._id });

        let totalProfit = 0;
        orders.forEach(order => {
          order.items.forEach(item => {
            // Check if the item belongs to the current seller
            if (item.seller && item.seller.toString() === seller._id.toString()) {
              totalProfit += item.price * item.quantity;
            }
          });
        });

        return {
          _id: seller._id,
          name: seller.name,
          email: seller.email,
          productCount,
          totalProfit
        };
      })
    );

    res.status(200).json({
      success: true,
      data: sellerAnalytics
    });
  } catch (error) {
    next(error);
  }
};
