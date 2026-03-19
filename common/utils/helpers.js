// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Validate latitude and longitude
const validateCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

// Determine responder vehicle type based on incident type.
// Returns the exact vehicleType enum value used in the Vehicle model.
const getResponderType = (incidentType) => {
  const typeMap = {
    'robbery': 'police_car',
    'assault': 'police_car',
    'fire': 'fire_truck',
    'medical': 'ambulance',
    'accident': 'ambulance'
  };
  return typeMap[incidentType.toLowerCase()] || null;
};

module.exports = {
  calculateDistance,
  validateCoordinates,
  getResponderType
};
