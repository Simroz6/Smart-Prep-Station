const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String
  },
  description: {
    type: String
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  position: {
    type: String,
    enum: ['hero', 'sidebar', 'bottom', 'popup'],
    default: 'hero'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
