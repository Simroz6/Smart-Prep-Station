const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const shippingData = require('../utils/shippingData');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod = 'cod', referralCode } = req.body;

    // Validate and get affiliate if referral code provided
    let referredByAffiliate = null;
    if (referralCode) {
      const affiliate = await User.findOne({ 
        referralCode: referralCode.toUpperCase(),
        isAffiliate: true
      });
      if (affiliate) {
        referredByAffiliate = affiliate._id;
      }
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'title price stock images seller');

    if (!cart || cart.items.length === 0) {
      return next(new ErrorResponse('Cart is empty', 400));
    }

    // Validate stock for all items
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return next(new ErrorResponse(
          `Insufficient stock for ${item.title}. Available: ${item.product.stock}`,
          400
        ));
      }
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Dynamic Shipping Cost based on Karachi areas
    let shippingCost = 0;
    const areaInfo = shippingData.find(s => s.area === shippingAddress.area);
    shippingCost = areaInfo ? areaInfo.charge : 300; // Default to 300 if area not found

    const tax = 0;
    const totalAmount = subtotal + shippingCost;

    // Group items by seller
    const sellerGroups = {};
    cart.items.forEach(item => {
      const sellerId = item.seller._id.toString();
      if (!sellerGroups[sellerId]) {
        sellerGroups[sellerId] = {
          seller: item.seller._id,
          sellerName: item.seller.name,
          items: [],
          sellerSubtotal: 0
        };
      }
      sellerGroups[sellerId].items.push({
        product: item.product._id,
        title: item.product.title,
        price: item.price,
        quantity: item.quantity,
        image: item.product.images[0]?.url || '',
        selectedVariants: item.selectedVariants,
        seller: item.seller._id
      });
      sellerGroups[sellerId].sellerSubtotal += item.price * item.quantity;
    });

    // Create order
    const order = await Order.create({
      customer: req.user.id,
      referralCode: referralCode ? referralCode.toUpperCase() : null,
      referredByAffiliate,
      items: cart.items.map(item => ({
        product: item.product._id,
        title: item.product.title,
        price: item.price,
        quantity: item.quantity,
        image: item.product.images[0]?.url || '',
        selectedVariants: item.selectedVariants,
        seller: item.seller._id
      })),
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      sellerOrders: Object.values(sellerGroups).map(group => ({
        seller: group.seller,
        items: group.items,
        sellerSubtotal: group.sellerSubtotal,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: new Date()
        }]
      })),
      statusHistory: [{
        status: 'pending',
        timestamp: new Date()
      }]
    });

    // NOTE: Stock is NOT reduced here. Stock will be reduced when seller approves the order.

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [], subtotal: 0 }
    );

    // Populate for response
    await order.populate('customer', 'name email');

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { customer: req.user.id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('items.product', 'title images')
      .populate('referredByAffiliate', 'name')
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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    }).populate('items.product', 'title price images')
      .populate('sellerOrders.seller', 'name')
      .populate('customer', 'name email')
      .populate('referredByAffiliate', 'name');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Can only cancel if not shipped or delivered
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return next(new ErrorResponse(
        'Order cannot be cancelled at this stage',
        400
      ));
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason
    });

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller orders
// @route   GET /api/orders/seller
// @access  Private/Seller
exports.getSellerOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const sellerId = req.user.id;

    let matchQuery = { 'sellerOrders.seller': new mongoose.Types.ObjectId(sellerId) };
    if (status) {
      matchQuery['sellerOrders.status'] = status;
    }
    console.log('Seller Orders - Initial matchQuery:', JSON.stringify(matchQuery, null, 2));

    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $unwind: {
          path: '$customerDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'referredByAffiliate',
          foreignField: '_id',
          as: 'affiliateDetails'
        }
      },
      {
        $unwind: {
          path: '$affiliateDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      { $unwind: '$sellerOrders' },
      { $match: { 'sellerOrders.seller': new mongoose.Types.ObjectId(sellerId) } },
      {
        $project: {
          _id: '$sellerOrders._id',
          orderId: '$_id',
          orderNumber: '$orderNumber',
          createdAt: '$createdAt',
          customer: {
            _id: '$customerDetails._id',
            name: '$customerDetails.name',
            email: '$customerDetails.email'
          },
          affiliate: {
            _id: '$affiliateDetails._id',
            name: '$affiliateDetails.name'
          },
          shippingAddress: '$shippingAddress',
          paymentMethod: '$paymentMethod',
          paymentStatus: '$paymentStatus',
          referralCode: '$referralCode',
          status: '$sellerOrders.status',
          statusHistory: '$sellerOrders.statusHistory',
          items: '$sellerOrders.items',
          sellerSubtotal: '$sellerOrders.sellerSubtotal',
          seller: '$sellerOrders.seller',
          updatedAt: '$sellerOrders.updatedAt' || '$updatedAt',
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ];

    const sellerOrders = await Order.aggregate(aggregationPipeline);

    const totalOrdersCountPipeline = [
      { $match: matchQuery },
      { $unwind: '$sellerOrders' },
      { $match: { 'sellerOrders.seller': new mongoose.Types.ObjectId(sellerId) } },
      { $count: 'total' }
    ];

    const totalOrdersCount = await Order.aggregate(totalOrdersCountPipeline);
    const total = totalOrdersCount.length > 0 ? totalOrdersCount[0].total : 0;
    console.log('Seller Orders - Total Count:', total);
		
    res.status(200).json({
      success: true,
      data: {
        orders: sellerOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    next(error);
  }
};

// @desc    Update seller order status
// @route   PUT /api/orders/:orderId/seller/status
// @access  Private/Seller
exports.updateSellerOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    const sellerOrderIndex = order.sellerOrders.findIndex(
      so => so.seller.toString() === req.user.id
    );

    if (sellerOrderIndex === -1) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    const currentStatus = order.sellerOrders[sellerOrderIndex].status;
    
    // Prevent going backwards
    if (status === 'cancelled' && !['pending', 'confirmed'].includes(currentStatus)) {
      return next(new ErrorResponse('Cannot cancel at this stage', 400));
    }

    // If seller is processing the order, reduce stock
    if (status === 'processing' && currentStatus === 'confirmed') {
      const sellerOrder = order.sellerOrders[sellerOrderIndex];
      
      // Reduce stock for each item
      for (const item of sellerOrder.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // If order is being delivered, add revenue to seller
    if (status === 'delivered') {
      const sellerOrder = order.sellerOrders[sellerOrderIndex];
      // Add revenue to seller
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { revenue: sellerOrder.sellerSubtotal }
      });

      // Update payment status to paid and remove tax from total
      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
      }
      
      if (order.tax > 0) {
        order.totalAmount = order.totalAmount - order.tax;
        order.tax = 0;
      }

      // Credit affiliate commission if order was referred
      if (order.referredByAffiliate) {
        const affiliate = await User.findById(order.referredByAffiliate);
        if (affiliate && affiliate.isAffiliate) {
          const commissionAmount = Math.round(order.totalAmount * 0.05 * 100) / 100; // 5% commission
          
          // Add commission to affiliate's earnings
          await User.findByIdAndUpdate(order.referredByAffiliate, {
            $inc: { affiliateEarnings: commissionAmount },
            $push: {
              affiliateCommissions: {
                order: order._id,
                customerName: order.shippingAddress?.fullName || 'Customer',
                orderAmount: order.totalAmount,
                commissionAmount,
                status: 'pending',
                createdAt: new Date()
              }
            }
          });
        }
      }
    }

    // If seller is rejecting the order, restore stock
    if (status === 'cancelled' && ['pending', 'confirmed'].includes(currentStatus)) {
      const sellerOrder = order.sellerOrders[sellerOrderIndex];
      
      // Restore stock for each item
      for (const item of sellerOrder.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    order.sellerOrders[sellerOrderIndex].status = status;
    order.sellerOrders[sellerOrderIndex].statusHistory.push({
      status,
      timestamp: new Date(),
      note
    });

    // If all seller orders have same status, update main order status
    const allStatuses = order.sellerOrders.map(so => so.status);
    const uniqueStatuses = [...new Set(allStatuses)];
    
    if (uniqueStatuses.length === 1) {
      order.status = status;
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order status updated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller revenue
// @route   GET /api/orders/seller/revenue
// @access  Private/Seller
exports.getSellerRevenue = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    let startDate;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    const revenue = await Order.aggregate([
      { $unwind: '$sellerOrders' },
      {
        $match: {
          'sellerOrders.seller': req.user._id,
          'sellerOrders.status': 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$sellerOrders.sellerSubtotal' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$sellerOrders.sellerSubtotal' }
        }
      }
    ]);

    // Monthly breakdown
    const monthlyRevenue = await Order.aggregate([
      { $unwind: '$sellerOrders' },
      {
        $match: {
          'sellerOrders.seller': req.user._id,
          'sellerOrders.status': 'delivered'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$sellerOrders.sellerSubtotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: revenue[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
        monthlyRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
