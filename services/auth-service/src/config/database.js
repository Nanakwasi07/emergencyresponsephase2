const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'auth_service' });
    console.log('Auth Service: MongoDB connected');
  } catch (error) {
    console.error('Auth Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
