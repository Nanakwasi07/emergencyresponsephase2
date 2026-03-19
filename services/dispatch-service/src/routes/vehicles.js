const express = require('express');
const router = express.Router();
const { Vehicle, LocationHistory } = require('../models/Vehicle');
const { verifyToken } = require('../../../../common/middleware/auth');
const { validateRequest, schemas } = require('../../../../common/validators/schemas');
const { publish } = require('../../../../common/messaging/rabbitmq');
const { EVENTS } = require('../../../../common/messaging/events');

// Socket.IO instance injected by server.js
let io = null;
const setIO = (socketIO) => { io = socketIO; };

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Emergency vehicle registration and location tracking
 */

/**
 * @swagger
 * /vehicles/register:
 *   post:
 *     summary: Register a new emergency vehicle
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleType
 *               - serviceId
 *               - latitude
 *               - longitude
 *             properties:
 *               vehicleType:
 *                 type: string
 *                 enum: [ambulance, police_car, fire_truck]
 *               serviceId:
 *                 type: string
 *               driverId:
 *                 type: string
 *               driverName:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 example: 5.6037
 *               longitude:
 *                 type: number
 *                 example: -0.1870
 *     responses:
 *       201:
 *         description: Vehicle registered successfully
 */
router.post('/register', verifyToken, validateRequest(schemas.registerVehicle), async (req, res) => {
  try {
    const { vehicleType, serviceId, driverId, driverName, latitude, longitude } = req.validatedBody;

    const vehicle = new Vehicle({
      vehicleType,
      serviceId,
      driverId: driverId || `driver_${Date.now()}`,
      driverName: driverName || 'Unknown',
      latitude,
      longitude
    });

    await vehicle.save();

    publish(EVENTS.VEHICLE_REGISTERED, {
      vehicleId: vehicle._id,
      vehicleType,
      serviceId,
      status: vehicle.status
    });

    res.status(201).json({ message: 'Vehicle registered successfully', vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ambulance, police_car, fire_truck]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, dispatched, on_scene, in_transit, unavailable]
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.vehicleType = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const vehicles = await Vehicle.find(filter);
    res.json({ vehicles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles/{id}/location:
 *   get:
 *     summary: Get current vehicle location
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle location
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id/location', verifyToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    res.json({
      vehicleId: vehicle._id,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      status: vehicle.status,
      lastUpdate: vehicle.lastLocationUpdate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles/{id}/location:
 *   post:
 *     summary: Update vehicle GPS location (called by driver app)
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.post('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { latitude, longitude, lastLocationUpdate: new Date() },
      { new: true }
    );

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Save location history
    await LocationHistory.create({ vehicleId: vehicle._id, latitude, longitude });

    // Publish event for analytics
    const locationPayload = {
      vehicleId: vehicle._id,
      vehicleType: vehicle.vehicleType,
      latitude,
      longitude,
      status: vehicle.status,
      currentIncidentId: vehicle.currentIncidentId || null,
      timestamp: new Date()
    };
    publish(EVENTS.VEHICLE_LOCATION_UPDATED, locationPayload);

    // Broadcast via Socket.IO to all connected clients
    if (io) {
      io.emit('vehicle:location', locationPayload);
    }

    res.json({ message: 'Location updated successfully', vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles/{id}/status:
 *   put:
 *     summary: Update vehicle status
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, dispatched, on_scene, in_transit, unavailable]
 *               incidentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle status updated
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, incidentId } = req.body;

    const updateData = { status };
    if (incidentId) updateData.currentIncidentId = incidentId;
    if (status === 'available') {
      updateData.currentIncidentId = null;
    }

    const mongoUpdate = { $set: updateData };
    if (status === 'available') {
      mongoUpdate.$inc = { totalIncidentsResponded: 1 };
    }

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Publish event for incident-service and analytics
    publish(EVENTS.VEHICLE_STATUS_CHANGED, {
      vehicleId: vehicle._id,
      vehicleType: vehicle.vehicleType,
      status: vehicle.status,
      incidentId: vehicle.currentIncidentId || null,
      timestamp: new Date()
    });

    res.json({ message: 'Vehicle status updated', vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicles/{id}/location-history:
 *   get:
 *     summary: Get vehicle location history
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Location history
 */
router.get('/:id/location-history', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await LocationHistory.find({ vehicleId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, setIO };
