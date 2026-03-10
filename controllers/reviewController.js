const Review = require('../models/Review');
const Product = require('../models/Product');

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Build sort object
    let sortObj = {};
    if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'highest') sortObj = { rating: -1 };
    else if (sort === 'lowest') sortObj = { rating: 1 };
    else if (sort === 'helpful') sortObj = { helpful: -1 };

    const reviews = await Review.find({ product: productId, status: 'approved' })
      .populate('user', 'name avatar')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ product: productId, status: 'approved' });

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error in getProductReviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a review
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if user purchased the product (optional)
    // This would require joining with orders collection

    const review = new Review({
      product: productId,
      user: req.user.id,
      rating,
      title,
      comment,
      images,
      status: 'pending' // Reviews need approval
    });

    await review.save();
    await review.populate('user', 'name avatar');

    res.status(201).json(review);
  } catch (error) {
    console.error('Error in createReview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images } = req.body;

    const review = await Review.findOne({ _id: id, user: req.user.id });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images) review.images = images;
    review.status = 'pending'; // Re-submit for approval

    await review.save();
    await review.populate('user', 'name avatar');

    res.json(review);
  } catch (error) {
    console.error('Error in updateReview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOneAndDelete({
      _id: id,
      user: req.user.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error in deleteReview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.helpful += 1;
    await review.save();

    res.json({ message: 'Marked as helpful', helpful: review.helpful });
  } catch (error) {
    console.error('Error in markHelpful:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
