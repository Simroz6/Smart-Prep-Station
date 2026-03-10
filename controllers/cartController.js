const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to populate cart
const populateCart = async (cart) => {
  if (!cart) return null;
  try {
    return await Cart.findById(cart._id)
      .populate('items.product', 'title price images stock');
  } catch (err) {
    console.error('Population error:', err);
    return cart;
  }
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title price images stock');

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          _id: null,
          user: req.user._id,
          items: [],
          subtotal: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedVariants = [] } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required', 400));
    }

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not available', 400));
    }

    if (product.stock < quantity) {
      return next(new ErrorResponse('Insufficient stock', 400));
    }

    let cart = await Cart.findOne({ user: req.user._id });

    // If no cart exists, create it first
    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: []
      });
    }

    // Find if item with same productId AND same variants exists
    const existingItemIndex = cart.items.findIndex(item => {
      if (item.product.toString() !== productId) return false;
      
      // Compare variants
      if (item.selectedVariants.length !== selectedVariants.length) return false;
      
      return selectedVariants.every(sv => 
        item.selectedVariants.some(isv => isv.name === sv.name && isv.option === sv.option)
      );
    });

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > product.stock) {
        return next(new ErrorResponse(`Only ${product.stock} items available`, 400));
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        product: product._id,
        title: product.title,
        price: product.price,
        quantity,
        image: product.images?.length ? product.images[0].url : '',
        selectedVariants,
        seller: product.seller
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'title price images stock');

    res.status(200).json({
      success: true,
      data: populatedCart,
      message: 'Item added to cart'
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity < 1) {
      return next(new ErrorResponse('Quantity must be at least 1', 400));
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const itemIndex = cart.items.findIndex(
      item => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return next(new ErrorResponse('Item not found in cart', 404));
    }

    // Check stock
    const productId = cart.items[itemIndex].product;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not available', 400));
    }

    if (quantity > product.stock) {
      return next(new ErrorResponse(`Only ${product.stock} items available`, 400));
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await populateCart(cart);

    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Cart updated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const itemIndex = cart.items.findIndex(
      item => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return next(new ErrorResponse('Item not found in cart', 404));
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const updatedCart = await populateCart(cart);

    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Item removed from cart'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], subtotal: 0 }
    );

    res.status(200).json({
      success: true,
      data: { user: req.user._id, items: [], subtotal: 0 },
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cart count
// @route   GET /api/cart/count
// @access  Private
exports.getCartCount = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

// REMOVED the duplicate module.exports at the bottom