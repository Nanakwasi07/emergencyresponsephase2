const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    citizenName: {
      type: String,
      required: true
    },
    incidentType: {
      type: String,
      enum: ['robbery', 'assault', 'fire', 'medical', 'accident'],
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
    notes: {
      type: String,
      default: ''
    },
    adminId: {
      type: String,
      required: true
    },
    assignedUnit: {
      vehicleId: String,
      vehicleType: String,
      serviceType: String
    },
    status: {
      type: String,
      enum: ['Created', 'Dispatched', 'In Progress', 'Resolved'],
      default: 'Created'
    },
    resolvedAt: Date,
    responseTime: Number // in minutes
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
