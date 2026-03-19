const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    stationType: {
      type: String,
      enum: ['police', 'fire', 'hospital'],
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    },
    region: {
      type: String,
      default: ''
    },
    contactPhone: {
      type: String,
      default: ''
    },
    // Hospital-specific capacity fields
    totalBeds: {
      type: Number,
      default: 0
    },
    availableBeds: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    adminId: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Station', stationSchema);
