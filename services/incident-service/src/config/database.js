const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'incident_service' });
    console.log('Incident Service: MongoDB connected');
  } catch (error) {
    console.error('Incident Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
