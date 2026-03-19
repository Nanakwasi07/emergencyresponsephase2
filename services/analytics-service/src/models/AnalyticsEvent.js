const mongoose = require('mongoose');

// Generic event store — each RabbitMQ event consumed is persisted here
const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });

// Aggregated incident summary document (one per incident, upserted on events)
const incidentSummarySchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true },
    incidentType: String,
    citizenName: String,
    latitude: Number,
    longitude: Number,
    adminId: String,
    status: { type: String, default: 'Created' },
    responseTime: Number, // minutes
    createdAt: Date,
    resolvedAt: Date,
    assignedUnit: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

incidentSummarySchema.index({ incidentType: 1 });
incidentSummarySchema.index({ status: 1 });
incidentSummarySchema.index({ createdAt: -1 });

// Aggregated vehicle summary
const vehicleSummarySchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, unique: true },
    vehicleType: String,
    status: String,
    lastLatitude: Number,
    lastLongitude: Number,
    lastSeen: Date,
    totalLocationUpdates: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = {
  AnalyticsEvent: mongoose.model('AnalyticsEvent', analyticsEventSchema),
  IncidentSummary: mongoose.model('IncidentSummary', incidentSummarySchema),
  VehicleSummary: mongoose.model('VehicleSummary', vehicleSummarySchema)
};
