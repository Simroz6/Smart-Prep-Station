const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/seed', require('./routes/seed'));
app.use('/api/affiliate', require('./routes/affiliate'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route for API
app.get('/api', (req, res) => {
  res.json({ message: 'Smart Prep Station API' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
