const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    publicId: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to calculate average rating
reviewSchema.statics.calcAverageRating = async function(productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      'rating.average': Math.round(stats[0].avgRating * 10) / 10,
      'rating.count': stats[0].count
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
};

// Update product rating after save
reviewSchema.post('save', function() {
  this.constructor.calcAverageRating(this.product);
});

// Update product rating after remove
reviewSchema.post('remove', function(next) {
  this.constructor.calcAverageRating(this.product);
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
