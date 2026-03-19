const express = require('express');
const router = express.Router();
const axios = require('axios');
const Incident = require('../models/Incident');
const { verifyToken } = require('../../../../common/middleware/auth');
const { validateRequest, schemas } = require('../../../../common/validators/schemas');
const { calculateDistance, getResponderType } = require('../../../../common/utils/helpers');
const { publish } = require('../../../../common/messaging/rabbitmq');
const { EVENTS } = require('../../../../common/messaging/events');

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Emergency incident management
 */

/**
 * @swagger
 * /incidents:
 *   post:
 *     summary: Create a new incident
 *     tags: [Incidents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - citizenName
 *               - incidentType
 *               - latitude
 *               - longitude
 *             properties:
 *               citizenName:
 *                 type: string
 *                 example: Kwame Mensah
 *               incidentType:
 *                 type: string
 *                 enum: [robbery, assault, fire, medical, accident]
 *               latitude:
 *                 type: number
 *                 example: 5.6037
 *               longitude:
 *                 type: number
 *                 example: -0.1870
 *               notes:
 *                 type: string
 *               adminId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Incident created and responder matching triggered
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, validateRequest(schemas.createIncident), async (req, res) => {
  try {
    const { citizenName, incidentType, latitude, longitude, notes } = req.validatedBody;
    const adminId = req.validatedBody.adminId || req.user.userId;

    const incident = new Incident({
      citizenName,
      incidentType,
      latitude,
      longitude,
      notes,
      adminId
    });

    await incident.save();

    // Publish event for analytics
    publish(EVENTS.INCIDENT_CREATED, {
      incidentId: incident._id,
      citizenName,
      incidentType,
      latitude,
      longitude,
      adminId,
      status: incident.status,
      createdAt: incident.createdAt
    });

    // Trigger responder matching asynchronously (non-blocking)
    matchAndDispatchResponder(incident._id, incidentType, latitude, longitude).catch((err) =>
      console.error('[Incident] Dispatch error:', err.message)
    );

    res.status(201).json({
      message: 'Incident created successfully. Dispatching nearest responder...',
      incident
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /incidents/open:
 *   get:
 *     summary: Get all open (unresolved) incidents
 *     tags: [Incidents]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of open incidents
 */
// NOTE: /open MUST be defined before /:id so Express does not treat "open" as an ID
router.get('/open', verifyToken, async (req, res) => {
  try {
    const incidents = await Incident.find({
      status: { $ne: 'Resolved' }
    }).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /incidents/all:
 *   get:
 *     summary: Get all incidents (including resolved)
 *     tags: [Incidents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of all incidents
 */
router.get('/all', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Incident.countDocuments()
    ]);

    res.json({ incidents, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /incidents/{id}:
 *   get:
 *     summary: Get incident by ID
 *     tags: [Incidents]
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
 *         description: Incident details
 *       404:
 *         description: Incident not found
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /incidents/{id}/status:
 *   put:
 *     summary: Update incident status
 *     tags: [Incidents]
 *     security:
 *       - BearerAuth: []
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
 *                 enum: [Created, Dispatched, In Progress, Resolved]
 *               assignedUnit:
 *                 type: object
 *     responses:
 *       200:
 *         description: Incident status updated
 *       404:
 *         description: Incident not found
 */
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, assignedUnit } = req.body;

    // Fetch first so we can calculate responseTime accurately
    const existing = await Incident.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const updateData = { status };
    if (assignedUnit) updateData.assignedUnit = assignedUnit;
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
      updateData.responseTime = Math.round((Date.now() - existing.createdAt.getTime()) / 60000);
    }

    const incident = await Incident.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Publish status update event
    publish(EVENTS.INCIDENT_STATUS_UPDATED, {
      incidentId: incident._id,
      status: incident.status,
      incidentType: incident.incidentType,
      responseTime: incident.responseTime || null,
      resolvedAt: incident.resolvedAt || null
    });

    if (status === 'Resolved') {
      publish(EVENTS.INCIDENT_RESOLVED, {
        incidentId: incident._id,
        incidentType: incident.incidentType,
        responseTime: incident.responseTime,
        assignedUnit: incident.assignedUnit
      });
    }

    res.json({ message: 'Incident status updated', incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /incidents/{id}/assign:
 *   put:
 *     summary: Manually trigger responder assignment for an incident
 *     tags: [Incidents]
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
 *         description: Responder assigned
 *       404:
 *         description: Incident or responder not found
 */
router.put('/:id/assign', verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const responder = await matchAndDispatchResponder(
      incident._id,
      incident.incidentType,
      incident.latitude,
      incident.longitude
    );

    if (!responder) {
      return res.status(404).json({ error: 'No available responder found' });
    }

    res.json({ message: 'Responder assigned successfully', responder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Helper: find nearest available vehicle and dispatch via RabbitMQ + HTTP
// ---------------------------------------------------------------------------
async function matchAndDispatchResponder(incidentId, incidentType, incLat, incLon) {
  try {
    const vehicleType = getResponderType(incidentType);
    if (!vehicleType) return null;

    // Query dispatch service for available vehicles of the correct type
    const response = await axios.get(
      `${process.env.DISPATCH_SERVICE_URL}/vehicles?type=${vehicleType}&status=available`
    );

    const vehicles = response.data.vehicles || [];
    if (vehicles.length === 0) return null;

    // Find geographically closest vehicle
    let closest = null;
    let minDistance = Infinity;

    for (const v of vehicles) {
      const dist = calculateDistance(incLat, incLon, v.latitude, v.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closest = v;
      }
    }

    if (!closest) return null;

    // Update incident record
    await Incident.findByIdAndUpdate(incidentId, {
      assignedUnit: {
        vehicleId: closest._id,
        vehicleType: closest.vehicleType,
        serviceType: vehicleType,
        driverName: closest.driverName || 'Unknown',
        distanceKm: parseFloat(minDistance.toFixed(2))
      },
      status: 'Dispatched'
    });

    // Publish event — dispatch-service consumes this to mark the vehicle dispatched
    publish(EVENTS.INCIDENT_DISPATCHED, {
      incidentId: incidentId.toString(),
      vehicleId: closest._id.toString(),
      vehicleType: closest.vehicleType,
      incidentType,
      latitude: incLat,
      longitude: incLon,
      distanceKm: parseFloat(minDistance.toFixed(2))
    });

    return closest;
  } catch (error) {
    console.error('[Incident] matchAndDispatchResponder error:', error.message);
    return null;
  }
}

module.exports = router;
