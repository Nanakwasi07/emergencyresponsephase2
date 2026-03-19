# System Architecture Documentation

## Overview

The Emergency Response and Dispatch Coordination Platform is built using a microservices architecture. This document describes the system design, API contracts, and inter-service communication patterns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
│              (Web UI - Phase 3, Mobile - Phase 3)          │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
    ┌──────▼──┐  ┌───▼────┐  ┌──▼─────┐ ┌─▼──────────┐
    │  Auth   │  │Incident │  │Dispatch│ │ Analytics  │
    │Service  │  │Service  │  │Service │ │  Service   │
    │(3001)   │  │(3002)   │  │(3003)  │ │  (3004)    │
    │         │  │         │  │        │ │            │
    │Express+ │  │Express+ │  │Express+│ │ Express+   │
    │Node.js  │  │Node.js  │  │Node.js │ │ Node.js    │
    └────┬────┘  └────┬────┘  └───┬────┘ └─┬──────────┘
         │            │            │        │
    ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
    │Auth DB  │  │Incident │  │Dispatch│
    │(Mongo)  │  │DB Mongo │  │DB Mongo│
    └─────────┘  └─────────┘  └────────┘
```

## Microservices Specifications

### 1. Authentication Service (Port 3001)

**Purpose:** Manages user identity, authentication, and authorization

**Technology Stack:**
- Express.js
- MongoDB
- JWT (JSON Web Tokens)
- bcryptjs (password hashing)

**Database:** `auth_service`

**Key Collections:**
- `users` - Stores user credentials and role information

**Responsibilities:**
- User registration and validation
- Login and credential verification
- JWT token generation and validation
- Token refresh mechanism
- User profile management
- Role-based access control

**API Endpoints:**
```
POST   /auth/register          - Register new user
POST   /auth/login              - Authenticate user
POST   /auth/refresh-token      - Refresh access token
GET    /auth/profile            - Get user information
```

**Data Model:**
```javascript
User {
  _id: ObjectId,
  name: String,
  email: String (unique),
  passwordHash: String (bcrypt),
  role: String (enum: admin, hospital_admin, police_admin, fire_admin),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Inter-service Communication:**
- Auth service is called by all other services to verify JWT tokens
- Endpoint: `GET /auth/profile` with Bearer token

### 2. Emergency Incident Service (Port 3002)

**Purpose:** Records, manages, and routes emergency incidents to appropriate responders

**Technology Stack:**
- Express.js
- MongoDB
- Axios (HTTP communication)
- Haversine formula (distance calculation)

**Database:** `incident_service`

**Key Collections:**
- `incidents` - Stores incident records and assignment information

**Responsibilities:**
- Accept incident reports from administrators
- Validate incident data and location information
- Implement intelligent responder matching:
  - Calculate distance using Haversine formula
  - Match responder type based on incident category
  - Select nearest available responder
- Track incident status throughout lifecycle
- Manage responder assignments
- Calculate response times

**API Endpoints:**
```
POST   /incidents                - Create new incident
GET    /incidents/:id            - Get incident details
GET    /incidents/open           - Get all open incidents
PUT    /incidents/:id/status     - Update incident status
PUT    /incidents/:id/assign     - Assign responder
```

**Data Model:**
```javascript
Incident {
  _id: ObjectId,
  citizenName: String,
  incidentType: String (enum: robbery, assault, fire, medical, accident),
  latitude: Number,
  longitude: Number,
  notes: String,
  adminId: String,
  assignedUnit: {
    vehicleId: String,
    vehicleType: String,
    serviceType: String
  },
  status: String (enum: Created, Dispatched, In Progress, Resolved),
  resolvedAt: Date,
  responseTime: Number (in minutes),
  createdAt: Date,
  updatedAt: Date
}
```

**Responder Matching Logic:**
1. Determine required responder type from incident type
2. Query Dispatch Service for available vehicles
3. Calculate distance from incident location to each vehicle
4. Select vehicle with minimum distance
5. Update vehicle status to "dispatched"
6. Update incident with assignment details

**Incident Type to Responder Mapping:**
- `robbery`, `assault` → Police (police_car)
- `fire` → Fire Service (fire_truck)
- `medical`, `accident` → Ambulance (ambulance)

### 3. Dispatch Tracking Service (Port 3003)

**Purpose:** Manages vehicle fleet and real-time location tracking

**Technology Stack:**
- Express.js
- MongoDB
- Socket.io (optional, for real-time updates)

**Database:** `dispatch_service`

**Key Collections:**
- `vehicles` - Vehicle registry and status
- `locationhistories` - Historical location tracking

**Responsibilities:**
- Register and manage vehicles
- Track real-time vehicle locations
- Maintain vehicle availability status
- Store location history for post-incident analysis
- Provide vehicle filtering and querying
- Support incident assignment updates

**API Endpoints:**
```
POST   /vehicles/register                - Register vehicle
GET    /vehicles                         - Get vehicles (with filters)
GET    /vehicles/:id/location            - Get current location
POST   /vehicles/:id/location            - Update location
PUT    /vehicles/:id/status              - Update vehicle status
GET    /vehicles/:id/location-history    - Get location history
```

**Data Models:**
```javascript
Vehicle {
  _id: ObjectId,
  vehicleType: String (enum: ambulance, police_car, fire_truck),
  serviceId: String (hospital_id, police_station_id, fire_station_id),
  driverId: String,
  driverName: String,
  latitude: Number,
  longitude: Number,
  status: String (enum: available, dispatched, on_scene, in_transit, unavailable),
  currentIncidentId: String,
  lastLocationUpdate: Date,
  totalIncidentsResponded: Number,
  createdAt: Date,
  updatedAt: Date
}

LocationHistory {
  _id: ObjectId,
  vehicleId: ObjectId (ref: Vehicle),
  latitude: Number,
  longitude: Number,
  timestamp: Date (default: now)
}
```

**Vehicle Status Lifecycle:**
```
available → dispatched → on_scene → in_transit → available
                    ↓
                unavailable (maintenance/break)
```

### 4. Analytics and Monitoring Service (Port 3004)

**Purpose:** Aggregates data from other services and provides operational insights

**Technology Stack:**
- Express.js
- MongoDB (minimal storage)
- Axios (service aggregation)

**Database:** `analytics_service` (minimal usage)

**Responsibilities:**
- Aggregate incident statistics
- Calculate response time metrics
- Generate vehicle utilization reports
- Provide dashboard data
- Query incident service for historical data
- Query dispatch service for fleet data

**API Endpoints:**
```
GET    /analytics/response-times        - Average response time stats
GET    /analytics/incidents-by-type     - Incidents grouped by type
GET    /analytics/incidents-by-region   - Incidents grouped by region
GET    /analytics/resource-utilization  - Vehicle utilization stats
GET    /analytics/dashboard             - Complete dashboard view
```

**Dashboard Data Structure:**
```javascript
Dashboard {
  summary: {
    totalIncidents: Number,
    resolvedIncidents: Number,
    openIncidents: Number,
    averageResponseTime: Number (minutes)
  },
  incidentsByType: {
    robbery: Number,
    assault: Number,
    fire: Number,
    medical: Number,
    accident: Number
  },
  vehicleStatus: {
    total: Number,
    available: Number,
    active: Number,
    unavailable: Number
  }
}
```

## Inter-Service Communication

### Communication Patterns

1. **Synchronous (HTTP REST)**
   - Incident Service calls Dispatch Service for available responders
   - Analytics Service queries other services for data
   - All services verify tokens with Auth Service

2. **Asynchronous (Future Implementation)**
   - Message Queue for incident status updates
   - Event streaming for real-time updates

### Service Connection Details

```javascript
// Auth Service
POST /auth/login → accessToken + refreshToken

// Incident Service
POST /incidents → Auto-triggered responder matching
GET http://dispatch-service/vehicles?type=ambulance

// Dispatch Service
POST /vehicles/:id/location → Real-time GPS updates
PUT /vehicles/:id/status → Status change from Incident Service

// Analytics Service
GET /incidents → Aggregate incident data
GET /vehicles → Aggregate vehicle data
```

## Authentication & Authorization

### JWT Token Structure

```javascript
AccessToken {
  userId: String,
  email: String,
  role: String (admin, hospital_admin, police_admin, fire_admin),
  exp: Unix timestamp (24 hours)
}

RefreshToken {
  userId: String,
  exp: Unix timestamp (7 days)
}
```

### Role Permissions

| Role | Register Incident | Create User | Manage Vehicles | View Analytics |
|------|------------------|-------------|-----------------|----------------|
| admin | ✓ | ✓ | ✓ | ✓ |
| hospital_admin | - | - | ✓ | ✓ |
| police_admin | - | - | ✓ | ✓ |
| fire_admin | - | - | ✓ | ✓ |

## Distance Calculation Algorithm

### Haversine Formula

Used to calculate the great-circle distance between two points on Earth given their latitude and longitude.

```
R = 6371 km (Earth's radius)
dLat = (lat2 - lat1) * π / 180
dLon = (lon2 - lon1) * π / 180
a = sin²(dLat/2) + cos(lat1*π/180) * cos(lat2*π/180) * sin²(dLon/2)
c = 2 * atan2(√a, √(1−a))
distance = R * c
```

## Database Isolation

Each service has its own MongoDB database:
- **auth_service** - User credentials and tokens
- **incident_service** - Incident records and assignments
- **dispatch_service** - Vehicle registry and location tracking
- **analytics_service** - Minimal cache (mostly queries other services)

**Data Consistency:**
- No direct database sharing between services
- All inter-service communication via HTTP APIs
- Each service maintains its own data integrity

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input validation |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Invalid token or permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected service error |

### Error Response Format

```javascript
{
  error: "Descriptive error message"
}
```

## Scalability Considerations

### Horizontal Scaling
- Each service can be scaled independently
- MongoDB sharding for large datasets
- Load balancer in front of service replicas

### Performance Optimization
- Database indexing on frequently queried fields
- Service-to-service connection pooling
- Caching layer (Redis) for analytics queries

### Future Enhancements
- Message queue (RabbitMQ/Kafka) for decoupled communication
- Service discovery (Consul/Eureka)
- API Gateway for unified entry point
- Circuit breaker pattern for resilience
- Distributed tracing (Jaeger/Zipkin)

## Deployment Architecture

### Development
- All services run locally on different ports
- MongoDB local instance or Atlas

### Production
- Containerized services (Docker)
- Kubernetes orchestration
- Separate databases for each service
- API Gateway/Load Balancer
- CI/CD pipeline

## Security Considerations

1. **Authentication:** JWT-based, verified per-request
2. **Password Security:** bcryptjs with salt rounds
3. **CORS:** Configure per service
4. **Input Validation:** Joi schema validation
5. **Rate Limiting:** Implement per-service (future)
6. **HTTPS:** Enable in production
7. **Environment Secrets:** Use .env (never commit)

## Testing Strategy

1. **Unit Tests:** Individual service endpoints
2. **Integration Tests:** Service-to-service communication
3. **End-to-End Tests:** Complete incident workflow
4. **Load Tests:** Performance under stress
5. **Security Tests:** JWT, CORS, validation

## Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB databases created and indexed
- [ ] JWT secrets generated and secured
- [ ] CORS configured for frontend domain
- [ ] API documentation reviewed
- [ ] Health check endpoints verified
- [ ] Monitoring and logging setup
- [ ] Error handling tested
- [ ] Database backups configured
