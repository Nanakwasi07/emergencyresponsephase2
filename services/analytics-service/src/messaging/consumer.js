const { subscribe } = require('../../../../common/messaging/rabbitmq');
const { QUEUES, BINDINGS, EVENTS } = require('../../../../common/messaging/events');
const {
  AnalyticsEvent,
  IncidentSummary,
  VehicleSummary
} = require('../models/AnalyticsEvent');

const handleIncidentEvent = async (routingKey, payload) => {
  // Persist raw event
  await AnalyticsEvent.create({ eventType: routingKey, payload });

  switch (routingKey) {
    case EVENTS.INCIDENT_CREATED:
      await IncidentSummary.findOneAndUpdate(
        { incidentId: payload.incidentId.toString() },
        {
          $setOnInsert: {
            incidentId: payload.incidentId.toString(),
            incidentType: payload.incidentType,
            citizenName: payload.citizenName,
            latitude: payload.latitude,
            longitude: payload.longitude,
            adminId: payload.adminId,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date()
          },
          $set: { status: payload.status || 'Created' }
        },
        { upsert: true, new: true }
      );
      break;

    case EVENTS.INCIDENT_DISPATCHED:
      await IncidentSummary.findOneAndUpdate(
        { incidentId: payload.incidentId.toString() },
        { $set: { status: 'Dispatched', assignedUnit: payload } },
        { upsert: true }
      );
      break;

    case EVENTS.INCIDENT_STATUS_UPDATED:
      await IncidentSummary.findOneAndUpdate(
        { incidentId: payload.incidentId.toString() },
        {
          $set: {
            status: payload.status,
            ...(payload.responseTime != null && { responseTime: payload.responseTime }),
            ...(payload.resolvedAt && { resolvedAt: new Date(payload.resolvedAt) })
          }
        },
        { upsert: true }
      );
      break;

    case EVENTS.INCIDENT_RESOLVED:
      await IncidentSummary.findOneAndUpdate(
        { incidentId: payload.incidentId.toString() },
        {
          $set: {
            status: 'Resolved',
            responseTime: payload.responseTime,
            resolvedAt: new Date()
          }
        },
        { upsert: true }
      );
      break;

    default:
      break;
  }
};

const handleVehicleEvent = async (routingKey, payload) => {
  await AnalyticsEvent.create({ eventType: routingKey, payload });

  if (routingKey === EVENTS.VEHICLE_LOCATION_UPDATED) {
    await VehicleSummary.findOneAndUpdate(
      { vehicleId: payload.vehicleId.toString() },
      {
        $set: {
          vehicleType: payload.vehicleType,
          status: payload.status,
          lastLatitude: payload.latitude,
          lastLongitude: payload.longitude,
          lastSeen: new Date()
        },
        $inc: { totalLocationUpdates: 1 }
      },
      { upsert: true }
    );
  }

  if (routingKey === EVENTS.VEHICLE_STATUS_CHANGED) {
    await VehicleSummary.findOneAndUpdate(
      { vehicleId: payload.vehicleId.toString() },
      { $set: { vehicleType: payload.vehicleType, status: payload.status, lastSeen: new Date() } },
      { upsert: true }
    );
  }
};

const startConsumers = async () => {
  await subscribe(
    QUEUES.ANALYTICS_INCIDENTS,
    BINDINGS[QUEUES.ANALYTICS_INCIDENTS],
    handleIncidentEvent
  );

  await subscribe(
    QUEUES.ANALYTICS_VEHICLES,
    BINDINGS[QUEUES.ANALYTICS_VEHICLES],
    handleVehicleEvent
  );

  console.log('[Analytics] RabbitMQ consumers started');
};

module.exports = { startConsumers };
