const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to populate wishlist
const populateWishlist = async (wishlist) => {
  if (!wishlist) return null;
  return await Wishlist.findById(wishlist._id)
    .populate('items.product', 'title price images rating');
};

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate('items.product', 'title price images rating');

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: {
          _id: null,
          user: req.user.id,
          items: []
        }
      });
    }

    res.status(200).json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

// Add item to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    if (!product.isActive) {
      return next(new ErrorResponse('Product is not available', 400));
    }

    // Find existing wishlist first
    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      // Create new wishlist
      wishlist = new Wishlist({
        user: req.user.id,
        items: []
      });
    } else {
      // Check if product already in wishlist
      const existingItem = wishlist.items.find(
        item => item.product.toString() === productId
      );

      if (existingItem) {
        return next(new ErrorResponse('Product already in wishlist', 400));
      }
    }

    // Add product to wishlist
    wishlist.items.push({ product: productId });
    await wishlist.save();

    // Populate and return
    const populatedWishlist = await populateWishlist(wishlist);

    res.status(200).json({
      success: true,
      data: populatedWishlist
    });
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      try {
        let wishlist = await Wishlist.findOne({ user: req.user.id });

        if (!wishlist) {
          return next(new ErrorResponse('Failed to create wishlist', 500));
        }

        // Check if product already exists
        const existingItem = wishlist.items.find(
          item => item.product.toString() === productId
        );

        if (existingItem) {
          return next(new ErrorResponse('Product already in wishlist', 400));
        }

        wishlist.items.push({ product: productId });
        await wishlist.save();

        const populatedWishlist = await populateWishlist(wishlist);

        return res.status(200).json({
          success: true,
          data: populatedWishlist
        });
      } catch (retryError) {
        return next(retryError);
      }
    }
    next(error);
  }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: {
          _id: null,
          user: req.user.id,
          items: []
        }
      });
    }

    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();

    const populatedWishlist = await populateWishlist(wishlist);

    res.status(200).json({
      success: true,
      data: populatedWishlist
    });
  } catch (error) {
    next(error);
  }
};

// Clear wishlist
exports.clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { items: [] }
    );

    res.status(200).json({
      success: true,
      data: { user: req.user.id, items: [] }
    });
  } catch (error) {
    next(error);
  }
};
