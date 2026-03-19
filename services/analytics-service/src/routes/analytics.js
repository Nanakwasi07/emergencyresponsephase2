const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../common/middleware/auth');
const { IncidentSummary, VehicleSummary, AnalyticsEvent } = require('../models/AnalyticsEvent');

// Ghana regions with approximate bounding boxes [minLat, maxLat, minLon, maxLon]
const GHANA_REGIONS = {
  'Greater Accra': [5.35, 5.95, -0.45, 0.15],
  'Ashanti': [6.3, 7.2, -2.0, -0.9],
  'Western': [4.7, 6.4, -3.3, -1.8],
  'Central': [5.0, 6.0, -1.9, -0.7],
  'Eastern': [5.7, 7.2, -1.2, 0.4],
  'Volta': [5.7, 8.8, -0.2, 1.2],
  'Oti': [7.8, 9.5, -0.2, 1.2],
  'Northern': [8.8, 10.7, -2.5, 0.5],
  'Savannah': [8.5, 11.0, -2.8, -0.5],
  'North East': [9.8, 10.9, -0.6, 0.8],
  'Upper East': [10.5, 11.2, -1.2, 0.6],
  'Upper West': [9.5, 11.2, -2.8, -1.0],
  'Bono': [7.0, 8.5, -3.0, -1.5],
  'Bono East': [7.0, 8.8, -1.5, -0.2],
  'Ahafo': [6.5, 7.8, -3.0, -1.8]
};

const getRegionForCoords = (lat, lon) => {
  for (const [region, [minLat, maxLat, minLon, maxLon]] of Object.entries(GHANA_REGIONS)) {
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) return region;
  }
  return 'Unknown';
};

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Operational analytics and monitoring
 */

/**
 * @swagger
 * /analytics/response-times:
 *   get:
 *     summary: Get average incident response times
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Response time statistics in minutes
 */
router.get('/response-times', verifyToken, async (_req, res) => {
  try {
    const resolved = await IncidentSummary.find({
      status: 'Resolved',
      responseTime: { $ne: null }
    }).select('responseTime incidentType');

    const total = await IncidentSummary.countDocuments();

    const avgByType = {};
    const typeTotals = {};
    const typeCounts = {};

    for (const inc of resolved) {
      if (!typeTotals[inc.incidentType]) {
        typeTotals[inc.incidentType] = 0;
        typeCounts[inc.incidentType] = 0;
      }
      typeTotals[inc.incidentType] += inc.responseTime;
      typeCounts[inc.incidentType]++;
    }

    for (const type of Object.keys(typeTotals)) {
      avgByType[type] = parseFloat((typeTotals[type] / typeCounts[type]).toFixed(2));
    }

    const totalResponseTime = resolved.reduce((s, i) => s + i.responseTime, 0);

    res.json({
      averageResponseTime:
        resolved.length > 0 ? parseFloat((totalResponseTime / resolved.length).toFixed(2)) : 0,
      resolvedIncidents: resolved.length,
      totalIncidents: total,
      averageByType: avgByType,
      unit: 'minutes'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/incidents-by-region:
 *   get:
 *     summary: Get incident counts grouped by Ghana region and type
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Incidents grouped by region and type
 */
router.get('/incidents-by-region', verifyToken, async (_req, res) => {
  try {
    const incidents = await IncidentSummary.find(
      { latitude: { $ne: null }, longitude: { $ne: null } },
      'latitude longitude incidentType status'
    );

    const regionData = {};

    for (const inc of incidents) {
      const region = getRegionForCoords(inc.latitude, inc.longitude);
      if (!regionData[region]) {
        regionData[region] = { total: 0, byType: {}, byStatus: {} };
      }
      regionData[region].total++;
      regionData[region].byType[inc.incidentType] =
        (regionData[region].byType[inc.incidentType] || 0) + 1;
      regionData[region].byStatus[inc.status] =
        (regionData[region].byStatus[inc.status] || 0) + 1;
    }

    res.json({ regions: regionData, totalIncidents: incidents.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/incidents-by-type:
 *   get:
 *     summary: Get incident counts grouped by type
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Incident counts per type
 */
router.get('/incidents-by-type', verifyToken, async (_req, res) => {
  try {
    const results = await IncidentSummary.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byType = { robbery: 0, assault: 0, fire: 0, medical: 0, accident: 0 };
    for (const r of results) {
      if (r._id && byType.hasOwnProperty(r._id)) byType[r._id] = r.count;
    }

    res.json(byType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/resource-utilization:
 *   get:
 *     summary: Get emergency vehicle resource utilization
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle utilization statistics
 */
router.get('/resource-utilization', verifyToken, async (_req, res) => {
  try {
    const vehicles = await VehicleSummary.find();

    const utilization = {
      total: vehicles.length,
      available: 0,
      dispatched: 0,
      on_scene: 0,
      in_transit: 0,
      unavailable: 0,
      byType: {
        ambulance: { total: 0, available: 0, dispatched: 0 },
        police_car: { total: 0, available: 0, dispatched: 0 },
        fire_truck: { total: 0, available: 0, dispatched: 0 }
      }
    };

    for (const v of vehicles) {
      if (utilization.hasOwnProperty(v.status)) utilization[v.status]++;
      if (v.vehicleType && utilization.byType[v.vehicleType]) {
        utilization.byType[v.vehicleType].total++;
        if (v.status === 'available') utilization.byType[v.vehicleType].available++;
        if (v.status === 'dispatched') utilization.byType[v.vehicleType].dispatched++;
      }
    }

    res.json(utilization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/most-deployed:
 *   get:
 *     summary: Get most frequently deployed vehicles
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Top deployed vehicles by type
 */
router.get('/most-deployed', verifyToken, async (_req, res) => {
  try {
    const results = await VehicleSummary.find()
      .sort({ totalLocationUpdates: -1 })
      .limit(10)
      .select('vehicleId vehicleType status totalLocationUpdates lastSeen');

    res.json({ topDeployed: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Full dashboard — summary, incidents by type, vehicle status
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Complete dashboard statistics
 */
router.get('/dashboard', verifyToken, async (_req, res) => {
  try {
    const [
      totalIncidents,
      resolvedIncidents,
      openIncidents,
      incidentsByTypeRaw,
      vehicles
    ] = await Promise.all([
      IncidentSummary.countDocuments(),
      IncidentSummary.countDocuments({ status: 'Resolved' }),
      IncidentSummary.countDocuments({ status: { $ne: 'Resolved' } }),
      IncidentSummary.aggregate([{ $group: { _id: '$incidentType', count: { $sum: 1 } } }]),
      VehicleSummary.find()
    ]);

    // Average response time
    const resolved = await IncidentSummary.find(
      { status: 'Resolved', responseTime: { $ne: null } },
      'responseTime'
    );
    const totalRT = resolved.reduce((s, i) => s + i.responseTime, 0);
    const avgRT = resolved.length > 0 ? parseFloat((totalRT / resolved.length).toFixed(2)) : 0;

    const incidentsByType = { robbery: 0, assault: 0, fire: 0, medical: 0, accident: 0 };
    for (const r of incidentsByTypeRaw) {
      if (r._id && incidentsByType.hasOwnProperty(r._id)) incidentsByType[r._id] = r.count;
    }

    const vehicleStatus = {
      total: vehicles.length,
      available: vehicles.filter((v) => v.status === 'available').length,
      active: vehicles.filter((v) => !['available', 'unavailable'].includes(v.status)).length,
      unavailable: vehicles.filter((v) => v.status === 'unavailable').length
    };

    res.json({
      summary: { totalIncidents, resolvedIncidents, openIncidents, averageResponseTime: avgRT },
      incidentsByType,
      vehicleStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /analytics/events:
 *   get:
 *     summary: Get recent raw analytics events (debug/admin)
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Recent events
 */
router.get('/events', verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.eventType = req.query.type;
    const limit = parseInt(req.query.limit) || 50;

    const events = await AnalyticsEvent.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ events, count: events.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
