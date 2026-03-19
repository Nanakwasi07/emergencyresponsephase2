const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ['ambulance', 'police_car', 'fire_truck'],
      required: true
    },
    serviceId: {
      type: String,
      required: true
    },
    driverId: String,
    driverName: String,
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'on_scene', 'in_transit', 'unavailable'],
      default: 'available'
    },
    currentIncidentId: String,
    lastLocationUpdate: {
      type: Date,
      default: Date.now
    },
    totalIncidentsResponded: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const locationHistorySchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  latitude: Number,
  longitude: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = {
  Vehicle: mongoose.model('Vehicle', vehicleSchema),
  LocationHistory: mongoose.model('LocationHistory', locationHistorySchema)
};
