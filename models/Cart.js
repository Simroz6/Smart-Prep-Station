const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  title: String,
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1'],
    default: 1
  },
  image: String,
  selectedVariants: [{
    name: String,
    option: String
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Keep normal index (NOT unique)
cartSchema.index({ user: 1 });

// Auto calculate subtotal
cartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
