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

const setupAdminSeller = async (email, password) => {
  await connectDB();
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email });
    if (user) {
      user.password = password; // User model has a pre-save hook that hashes the password
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`Updated existing user: ${email} to admin`);
    } else {
      user = await User.create({
        name: 'Admin Seller',
        email: email,
        password: password, // User model has a pre-save hook that hashes the password
        role: 'admin',
        isActive: true
      });
      console.log(`Created new admin+seller user: ${email}`);
    }
  } catch (error) {
    console.error('Error setting up user:', error);
  } finally {
    mongoose.connection.close();
  }
};

setupAdminSeller('simroz.asrany6@gmail.com', 'sohail');
