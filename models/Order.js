const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    min: [1, 'Quantity cannot be less than 1']
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

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: String,
  area: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: false
  },
  country: {
    type: String,
    required: true,
    default: 'Pakistan'
  },
  phone: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    default: null
  },
  referredByAffiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    enum: ['cod'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  sellerOrders: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    items: [orderItemSchema],
    sellerSubtotal: Number,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    statusHistory: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      note: String
    }]
  }],
  notes: String,
  cancellationReason: String,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
  
  next();
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
    
    if (this.status === 'delivered') {
      this.deliveredAt = new Date();
      if (this.paymentMethod === 'cod') {
        this.paymentStatus = 'paid';
      }
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
