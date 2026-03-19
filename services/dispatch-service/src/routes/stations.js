const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const { verifyToken } = require('../../../../common/middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Stations
 *   description: Police stations, fire stations, and hospitals
 */

/**
 * @swagger
 * /stations:
 *   post:
 *     summary: Register a new station
 *     tags: [Stations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - stationType
 *               - latitude
 *               - longitude
 *             properties:
 *               name:
 *                 type: string
 *                 example: Accra Central Police Station
 *               stationType:
 *                 type: string
 *                 enum: [police, fire, hospital]
 *               latitude:
 *                 type: number
 *                 example: 5.5502
 *               longitude:
 *                 type: number
 *                 example: -0.2174
 *               address:
 *                 type: string
 *               region:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               totalBeds:
 *                 type: integer
 *                 description: Hospitals only
 *               availableBeds:
 *                 type: integer
 *                 description: Hospitals only
 *     responses:
 *       201:
 *         description: Station registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, stationType, latitude, longitude, address, region, contactPhone, totalBeds, availableBeds } = req.body;

    if (!name || !stationType || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, stationType, latitude, and longitude are required' });
    }

    const station = new Station({
      name,
      stationType,
      latitude,
      longitude,
      address,
      region,
      contactPhone,
      totalBeds: totalBeds || 0,
      availableBeds: availableBeds || totalBeds || 0,
      adminId: req.user.userId
    });

    await station.save();
    res.status(201).json({ message: 'Station registered successfully', station });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: Get all stations
 *     tags: [Stations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [police, fire, hospital]
 *         description: Filter by station type
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *     responses:
 *       200:
 *         description: List of stations
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.stationType = req.query.type;
    if (req.query.region) filter.region = req.query.region;

    const stations = await Station.find(filter).sort({ name: 1 });
    res.json({ stations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /stations/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Stations]
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
 *         description: Station details
 *       404:
 *         description: Station not found
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /stations/{id}/capacity:
 *   put:
 *     summary: Update hospital bed capacity
 *     tags: [Stations]
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
 *             properties:
 *               totalBeds:
 *                 type: integer
 *               availableBeds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Capacity updated
 *       404:
 *         description: Station not found
 */
router.put('/:id/capacity', verifyToken, async (req, res) => {
  try {
    const { totalBeds, availableBeds } = req.body;
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    if (station.stationType !== 'hospital') {
      return res.status(400).json({ error: 'Capacity updates only apply to hospitals' });
    }

    if (totalBeds != null) station.totalBeds = totalBeds;
    if (availableBeds != null) station.availableBeds = availableBeds;
    await station.save();

    res.json({ message: 'Hospital capacity updated', station });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /stations/{id}:
 *   put:
 *     summary: Update station details
 *     tags: [Stations]
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
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               region:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Station updated
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const allowed = ['name', 'address', 'region', 'contactPhone', 'isActive', 'latitude', 'longitude'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const station = await Station.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!station) return res.status(404).json({ error: 'Station not found' });

    res.json({ message: 'Station updated', station });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
