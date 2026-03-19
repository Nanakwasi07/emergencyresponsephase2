const axios = require('axios');

const serviceClient = axios.create({
  timeout: 5000
});

// Add request interceptor to include JWT token
serviceClient.interceptors.request.use((config) => {
  const token = process.env.JWT_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Utility functions for service-to-service communication
const getResponders = async (responderType, excludeIds = []) => {
  try {
    const response = await serviceClient.get(
      `${process.env.DISPATCH_SERVICE_URL}/vehicles`,
      {
        params: { type: responderType, excludeIds }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting responders:', error.message);
    return [];
  }
};

const updateIncidentStatus = async (incidentId, status, assignedUnit) => {
  try {
    const response = await serviceClient.put(
      `${process.env.INCIDENT_SERVICE_URL}/incidents/${incidentId}/status`,
      { status, assignedUnit }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating incident status:', error.message);
    throw error;
  }
};

const getVehicleLocation = async (vehicleId) => {
  try {
    const response = await serviceClient.get(
      `${process.env.DISPATCH_SERVICE_URL}/vehicles/${vehicleId}/location`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting vehicle location:', error.message);
    return null;
  }
};

const verifyUserToken = async (token) => {
  try {
    const response = await serviceClient.get(
      `${process.env.AUTH_SERVICE_URL}/auth/profile`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error verifying user token:', error.message);
    return null;
  }
};

module.exports = {
  serviceClient,
  getResponders,
  updateIncidentStatus,
  getVehicleLocation,
  verifyUserToken
};
