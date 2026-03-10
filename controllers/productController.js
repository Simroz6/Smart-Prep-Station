const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      seller,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
      isActive = true
    } = req.query;

    const query = { isActive };

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      } else {
        // Assume it's a slug if not a valid ObjectId
        const foundCategory = await Category.findOne({ slug: category });
        if (foundCategory) {
          query.category = foundCategory._id;
        } else {
          // If category slug not found, return empty results
          return res.status(200).json({
            success: true,
            data: {
              products: [],
              pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
            }
          });
        }
      }
    }
    if (seller) query.seller = seller;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('seller', 'name')
      .populate('category', 'name slug')
      .sort(sort)
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    console.log('Product ID in getProduct:', req.params.id);
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email')
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Seller
exports.createProduct = async (req, res, next) => {
  try {
    req.body.seller = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Seller
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Make sure user is product owner or admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this product', 403));
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Seller
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Make sure user is product owner or admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this product', 403));
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seller's products
// @route   GET /api/products/seller/my-products
// @access  Private/Seller
exports.getSellerProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    const query = { seller: req.user.id };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const products = await Product.find(query)
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

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new ErrorResponse('Invalid product ID', 400));
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return next(new ErrorResponse('You have already reviewed this product', 400));
    }

    product.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    await product.calculateAverageRating();
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true, parent: null })
      .populate({
        path: 'subcategories',
        match: { isActive: true }
      });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('seller', 'name')
      .populate('category', 'name')
      .limit(8);

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};
