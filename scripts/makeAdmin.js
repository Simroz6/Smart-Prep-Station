const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const makeAdmin = async (email) => {
  await connectDB();
  try {
    let user = await User.findOne({ email });
    if (!user) {
      // Create new user as admin if doesn't exist
      const bcrypt = require('bcryptjs');
      user = await User.create({
        name: 'Admin User',
        email: email,
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true
      });
      console.log(`Created new admin user: ${email}`);
    } else {
      user.role = 'admin';
      await user.save();
    }
    console.log(`User ${email} is now an admin`);
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

makeAdmin('simroz.asrany6@gmail.com');
