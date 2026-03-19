# API Testing Guide

This document provides example requests for testing all microservices.

## Prerequisites

1. All services are running (see README.md)
2. MongoDB is running and accessible
3. You have a REST client (Postman, curl, or VS Code REST Client)

## Base URLs

```
Auth Service: http://localhost:3001
Incident Service: http://localhost:3002
Dispatch Service: http://localhost:3003
Analytics Service: http://localhost:3004
```

## Testing Workflow

### Step 1: Register a User

**Endpoint:** `POST /auth/register`
**Service:** Auth Service (Port 3001)

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Admin",
    "email": "admin@emergency.com",
    "password": "SecurePassword123",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "65a1234567890abc12345678",
    "name": "Emergency Admin",
    "email": "admin@emergency.com",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Step 2: Login and Get JWT Token

**Endpoint:** `POST /auth/login`
**Service:** Auth Service (Port 3001)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@emergency.com",
    "password": "SecurePassword123"
  }'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a1234567890abc12345678",
    "name": "Emergency Admin",
    "email": "admin@emergency.com",
    "role": "admin"
  }
}
```

**Save the `accessToken` - you'll need it for all subsequent requests.**

### Step 3: Register Vehicles (Dispatch Service)

**Endpoint:** `POST /vehicles/register`
**Service:** Dispatch Service (Port 3003)

#### Register an Ambulance

```bash
curl -X POST http://localhost:3003/vehicles/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "vehicleType": "ambulance",
    "serviceId": "accra_hospital_001",
    "driverName": "Samuel Amponsah",
    "latitude": 5.6037,
    "longitude": -0.1870
  }'
```

#### Register a Police Car

```bash
curl -X POST http://localhost:3003/vehicles/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "vehicleType": "police_car",
    "serviceId": "accra_police_station_001",
    "driverName": "Kwame Adomako",
    "latitude": 5.6050,
    "longitude": -0.1862
  }'
```

#### Register a Fire Truck

```bash
curl -X POST http://localhost:3003/vehicles/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "vehicleType": "fire_truck",
    "serviceId": "accra_fire_service_001",
    "driverName": "Ama Boateng",
    "latitude": 5.6020,
    "longitude": -0.1875
  }'
```

**Save the vehicle IDs from responses - you'll need them later.**

### Step 4: Get All Vehicles

**Endpoint:** `GET /vehicles`
**Service:** Dispatch Service (Port 3003)

```bash
curl -X GET http://localhost:3003/vehicles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Optional Query Parameters:**
- `type` - Filter by vehicle type (ambulance, police_car, fire_truck)
- `status` - Filter by status (available, dispatched, on_scene, in_transit, unavailable)

```bash
# Get only available ambulances
curl -X GET "http://localhost:3003/vehicles?type=ambulance&status=available" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 5: Create an Incident

**Endpoint:** `POST /incidents`
**Service:** Incident Service (Port 3002)

```bash
curl -X POST http://localhost:3002/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "citizenName": "Eso Mensah",
    "incidentType": "medical",
    "latitude": 5.6045,
    "longitude": -0.1855,
    "notes": "Patient with severe chest pain, difficulty breathing",
    "adminId": "admin_001"
  }'
```

**Incident Types:** robbery, assault, fire, medical, accident

**Expected Response:**
```json
{
  "message": "Incident created successfully",
  "incident": {
    "_id": "65a9876543210def87654321",
    "citizenName": "Eso Mensah",
    "incidentType": "medical",
    "latitude": 5.6045,
    "longitude": -0.1855,
    "notes": "Patient with severe chest pain",
    "status": "Created",
    "adminId": "admin_001",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

### Step 6: Get Open Incidents

**Endpoint:** `GET /incidents/open`
**Service:** Incident Service (Port 3002)

```bash
curl -X GET http://localhost:3002/incidents/open \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 7: Update Vehicle Location (Tracking)

**Endpoint:** `POST /vehicles/:id/location`
**Service:** Dispatch Service (Port 3003)

```bash
curl -X POST http://localhost:3003/vehicles/VEHICLE_ID/location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 5.6055,
    "longitude": -0.1860
  }'
```

**Note:** This endpoint doesn't require authentication to simulate real-time GPS updates from vehicles.

### Step 8: Get Vehicle Location

**Endpoint:** `GET /vehicles/:id/location`
**Service:** Dispatch Service (Port 3003)

```bash
curl -X GET http://localhost:3003/vehicles/VEHICLE_ID/location \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 9: Update Incident Status

**Endpoint:** `PUT /incidents/:id/status`
**Service:** Incident Service (Port 3002)

```bash
curl -X PUT http://localhost:3002/incidents/INCIDENT_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "status": "Dispatched",
    "assignedUnit": {
      "vehicleId": "VEHICLE_ID",
      "vehicleType": "ambulance",
      "serviceType": "ambulance"
    }
  }'
```

**Valid Status Values:** Created, Dispatched, In Progress, Resolved

### Step 10: Get Analytics Dashboard

**Endpoint:** `GET /analytics/dashboard`
**Service:** Analytics Service (Port 3004)

```bash
curl -X GET http://localhost:3004/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "summary": {
    "totalIncidents": 5,
    "resolvedIncidents": 2,
    "openIncidents": 3,
    "averageResponseTime": "12.50"
  },
  "incidentsByType": {
    "robbery": 1,
    "assault": 0,
    "fire": 1,
    "medical": 2,
    "accident": 1
  },
  "vehicleStatus": {
    "total": 3,
    "available": 1,
    "active": 1,
    "unavailable": 1
  }
}
```

### Step 11: Get Response Times Analytics

**Endpoint:** `GET /analytics/response-times`
**Service:** Analytics Service (Port 3004)

```bash
curl -X GET http://localhost:3004/analytics/response-times \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 12: Get Incidents by Type

**Endpoint:** `GET /analytics/incidents-by-type`
**Service:** Analytics Service (Port 3004)

```bash
curl -X GET http://localhost:3004/analytics/incidents-by-type \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 13: Get Resource Utilization

**Endpoint:** `GET /analytics/resource-utilization`
**Service:** Analytics Service (Port 3004)

```bash
curl -X GET http://localhost:3004/analytics/resource-utilization \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Error Response Format

```json
{
  "error": "Description of the error"
}
```

## Health Checks

Each service has a health check endpoint:

```bash
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Incident Service
curl http://localhost:3003/health  # Dispatch Service
curl http://localhost:3004/health  # Analytics Service
```

## Token Refresh

If your token expires, use the refresh endpoint:

**Endpoint:** `POST /auth/refresh-token`
**Service:** Auth Service (Port 3001)

```bash
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Complete Test Scenario

1. Register user
2. Login to get tokens
3. Register 3-5 vehicles (ambulances, police cars, fire trucks)
4. Create multiple incidents with different types
5. Track vehicle locations with updates
6. Update incident statuses
7. View analytics dashboard

This simulates a complete emergency response workflow from incident creation to resolution with real-time tracking.
