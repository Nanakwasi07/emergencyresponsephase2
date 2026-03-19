const Joi = require('joi');

const schemas = {
  registerUser: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6),
    role: Joi.string()
      .valid('admin', 'hospital_admin', 'police_admin', 'fire_admin', 'ambulance_driver')
      .required()
  }),

  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createIncident: Joi.object({
    citizenName: Joi.string().required().min(2),
    incidentType: Joi.string()
      .valid('robbery', 'assault', 'fire', 'medical', 'accident')
      .required(),
    latitude: Joi.number().required().min(-90).max(90),
    longitude: Joi.number().required().min(-180).max(180),
    notes: Joi.string().max(500),
    adminId: Joi.string().required()
  }),

  registerVehicle: Joi.object({
    vehicleType: Joi.string()
      .valid('ambulance', 'police_car', 'fire_truck')
      .required(),
    serviceId: Joi.string().required(),
    latitude: Joi.number().required().min(-90).max(90),
    longitude: Joi.number().required().min(-180).max(180),
    driverId: Joi.string()
  }),

  updateLocation: Joi.object({
    vehicleId: Joi.string().required(),
    latitude: Joi.number().required().min(-90).max(90),
    longitude: Joi.number().required().min(-180).max(180)
  })
};

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.validatedBody = value;
    next();
  };
};

module.exports = { schemas, validateRequest };
