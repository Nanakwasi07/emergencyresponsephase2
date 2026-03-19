// Event type constants for RabbitMQ messaging across all microservices

const EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'emergency_platform';

const EVENTS = {
  // Incident events
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_DISPATCHED: 'incident.dispatched',
  INCIDENT_STATUS_UPDATED: 'incident.status.updated',
  INCIDENT_RESOLVED: 'incident.resolved',

  // Vehicle / Dispatch events
  VEHICLE_REGISTERED: 'vehicle.registered',
  VEHICLE_LOCATION_UPDATED: 'vehicle.location.updated',
  VEHICLE_STATUS_CHANGED: 'vehicle.status.changed',

  // User events
  USER_REGISTERED: 'user.registered'
};

// Queue definitions – each service declares only the queues it consumes
const QUEUES = {
  ANALYTICS_INCIDENTS: 'analytics.incidents',
  ANALYTICS_VEHICLES: 'analytics.vehicles',
  ANALYTICS_USERS: 'analytics.users',
  DISPATCH_INCIDENTS: 'dispatch.incidents',
  INCIDENT_VEHICLES: 'incident.vehicles'
};

// Binding patterns: queue → routing key patterns it subscribes to
const BINDINGS = {
  [QUEUES.ANALYTICS_INCIDENTS]: ['incident.*'],
  [QUEUES.ANALYTICS_VEHICLES]: ['vehicle.*'],
  [QUEUES.ANALYTICS_USERS]: ['user.*'],
  [QUEUES.DISPATCH_INCIDENTS]: ['incident.dispatched'],
  [QUEUES.INCIDENT_VEHICLES]: ['vehicle.status.changed']
};

module.exports = { EXCHANGE, EVENTS, QUEUES, BINDINGS };
