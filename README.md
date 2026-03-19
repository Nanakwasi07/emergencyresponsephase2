# Emergency Response and Dispatch Coordination Platform - Phase 2

## Project Overview

This is the backend implementation (Phase 2) of a distributed emergency response and dispatch coordination platform built with microservices architecture. The system helps coordinate emergency responses by determining the nearest appropriate responder and tracking the response in real time.

## Architecture

The system consists of 4 independent microservices:

1. **Auth Service (Port 3001)** - User authentication and authorization
2. **Incident Service (Port 3002)** - Emergency incident management and responder matching
3. **Dispatch Service (Port 3003)** - Real-time vehicle location tracking
4. **Analytics Service (Port 3004)** - Statistics and operational insights

Each service:
- Runs independently
- Has its own MongoDB database
- Provides REST API endpoints
- Communicates with other services via HTTP

## Prerequisites

- Node.js v18 or higher
- MongoDB (local or Atlas connection)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

First, navigate to the project root and install the main dependencies:

```bash
npm install
```

Then install dependencies for each service:

```bash
cd services/auth-service && npm install
cd ../incident-service && npm install
cd ../dispatch-service && npm install
cd ../analytics-service && npm install
cd ../..
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and update with your configuration:

```bash
cp .env.example .env
```

**Important Settings:**
- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `JWT_SECRET`: Secret key for JWT tokens (change this in production)
- `NODE_ENV`: Set to `development` or `production`

### 3. Ensure MongoDB is Running

**If using local MongoDB:**
```bash
# On Windows
mongod

# On Mac/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

**If using MongoDB Atlas:**
- Update `MONGODB_URI` in `.env` with your Atlas connection string

### 4. Start All Services

From the project root, run:

```bash
# Production mode (all services start once)
npm start

# Development mode (with nodemon for auto-reload)
npm run dev
```

Alternatively, start each service individually:

```bash
# Terminal 1
npm run auth:dev

# Terminal 2
npm run incident:dev

# Terminal 3
npm run dispatch:dev

# Terminal 4
npm run analytics:dev
```

## API Documentation

Once services are running, access the Swagger UI documentation:

- **Auth Service**: http://localhost:3001/api-docs
- **Incident Service**: http://localhost:3002/api-docs
- **Dispatch Service**: http://localhost:3003/api-docs
- **Analytics Service**: http://localhost:3004/api-docs

## Service Endpoints Summary

### Auth Service
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive JWT tokens
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/profile` - Get user profile (requires authentication)

### Incident Service
- `POST /incidents` - Create a new incident
- `GET /incidents/:id` - Get incident details
- `GET /incidents/open` - Get all open incidents
- `PUT /incidents/:id/status` - Update incident status
- `PUT /incidents/:id/assign` - Assign a responder

### Dispatch Service
- `POST /vehicles/register` - Register a vehicle
- `GET /vehicles` - Get all vehicles (with filters)
- `GET /vehicles/:id/location` - Get vehicle location
- `POST /vehicles/:id/location` - Update vehicle location
- `PUT /vehicles/:id/status` - Update vehicle status
- `GET /vehicles/:id/location-history` - Get location history

### Analytics Service
- `GET /analytics/response-times` - Average response times
- `GET /analytics/incidents-by-type` - Incidents grouped by type
- `GET /analytics/resource-utilization` - Vehicle utilization stats
- `GET /analytics/dashboard` - Complete dashboard data

## Testing the System

### 1. Register a User (Auth Service)

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

### 2. Login (Auth Service)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Copy the `accessToken` from the response.

### 3. Register a Vehicle (Dispatch Service)

```bash
curl -X POST http://localhost:3003/vehicles/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vehicleType": "ambulance",
    "serviceId": "hospital_001",
    "driverName": "Driver Name",
    "latitude": 5.6037,
    "longitude": -0.1870
  }'
```

### 4. Create an Incident (Incident Service)

```bash
curl -X POST http://localhost:3002/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "citizenName": "Jane Smith",
    "incidentType": "medical",
    "latitude": 5.6050,
    "longitude": -0.1850,
    "notes": "Patient having chest pain",
    "adminId": "admin_001"
  }'
```

### 5. Get Dashboard Analytics (Analytics Service)

```bash
curl -X GET http://localhost:3004/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Structure

### Auth Service Database
- **users** collection: Stores user information with password hashes

### Incident Service Database
- **incidents** collection: Stores incident records and assignments

### Dispatch Service Database
- **vehicles** collection: Stores vehicle information
- **locationhistories** collection: Stores historical location data

### Analytics Service Database
- Queries data from other services; no significant local storage

## Key Features

✅ JWT-based authentication and authorization
✅ Automatic responder matching using distance calculation (Haversine formula)
✅ Real-time location tracking
✅ Comprehensive error handling and validation
✅ Inter-service communication via HTTP APIs
✅ Swagger/OpenAPI documentation
✅ Multi-service monitoring and analytics
✅ Role-based access control

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│          Frontend (React - Phase 3)             │
└────────┬──────┬──────┬──────────┬──────────────┘
         │      │      │          │
    ┌────▼──┐ ┌─▼───┐┌─▼────┐┌──▼── ────┐
    │Auth   │ │Inc. ││Disp. ││Analytics │
    │Port   │ │Port ││Port  ││Port      │
    │3001   │ │3002 ││3003  ││3004      │
    └────┬──┘ └──┬──┘└──┬───┘└──┬───────┘
         │       │      │       │
    ┌────▼──┐ ┌─▼───┐┌─▼────┐
    │Auth   │ │Inc. ││Disp. │
    │DB     │ │DB   ││DB    │
    │Mongo  │ │Mongo││Mongo │
    └───────┘ └─────┘└──────┘
```

## Development Notes

- Each service can be developed and deployed independently
- Services communicate via REST APIs (HTTP)
- JWT tokens are used for inter-service authentication
- MongoDB is used for data persistence
- Error handling includes proper HTTP status codes
- All endpoints are documented in Swagger

## Troubleshooting

**MongoDB Connection Error**
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB network access

**Port Already in Use**
- Change the port numbers in `.env`
- Kill existing processes: `lsof -ti:3001 | xargs kill -9`

**JWT Token Expired**
- Use the refresh-token endpoint to get a new access token
- Tokens expire after 24 hours (configurable in `.env`)

## Next Steps

1. Implement Phase 3: React frontend
2. Add WebSocket support for real-time updates
3. Implement message queue (RabbitMQ/Kafka) for async communication
4. Add caching layer (Redis)
5. Implement service discovery
6. Add comprehensive integration tests
7. Deploy to production environment

## License

MIT
