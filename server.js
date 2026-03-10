const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

const app = express();

// LOUD REQUEST LOGGER - This will show up in your terminal
app.use((req, res, next) => {
  console.log(`>>> [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: true, // Allow all origins for local debugging
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.use((req, res) => {
  console.log(`404: ${req.url}`);
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✔ MongoDB Connected');
  }
  catch (err) {
    console.error('✘ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

app.use(async (req, res, next) => {
  if(!isConnectedToDB) {
    connectToMongoDB();
  }
  next();
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('---------------------------------------------');
  console.log(`✔ BACKEND ACTIVE: http://localhost:${PORT}`);
  console.log('---------------------------------------------');
  
  connectDB().then(() => {
    console.log('✔ DATABASE CONNECTED');
  }).catch(err => {
    console.error('✘ DATABASE ERROR:', err.message);
  });
});

module.exports = server;