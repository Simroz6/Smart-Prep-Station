const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'seller', 'admin'],
    default: 'customer'
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sellerRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    requestedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  revenue: {
    type: Number,
    default: 0
  },
  // Affiliate fields
  isAffiliate: {
    type: Boolean,
    default: false
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  affiliateEarnings: {
    type: Number,
    default: 0
  },
  affiliateRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    requestedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  affiliateCommissions: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    customerName: String,
    orderAmount: Number,
    commissionAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  area: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Check if user is seller
userSchema.methods.isSeller = function() {
  return this.role === 'seller' || this.role === 'admin';
};

// Generate unique referral code
userSchema.methods.generateReferralCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REF';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  this.referralCode = code;
};

module.exports = mongoose.model('User', userSchema);
