import { useEffect, useState, useCallback } from 'react';
import { HiBuildingOffice2, HiExclamationTriangle, HiTrash, HiPlus, HiArrowPath } from 'react-icons/hi2';
import { dispatchAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import MapPicker from '../components/MapPicker.jsx';
import Spinner from '../components/Spinner.jsx';
import Badge from '../components/Badge.jsx';

const INSTITUTION_TYPES = ['police', 'fire', 'hospital'];

const VEHICLE_TYPES = {
  police: ['police_car'],
  fire: ['fire_truck'],
  hospital: ['ambulance'],
};

export default function InstitutionManagement() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    stationType: 'hospital',
    address: '',
    region: '',
    contactPhone: '',
    latitude: '',
    longitude: '',
    totalBeds: 100,
    availableBeds: 80,
  });

  const [vehicles, setVehicles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch institutions
  const fetchInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await dispatchAPI.get('/stations');
      let stationList = Array.isArray(data) ? data : data.stations || [];

      // Filter by role if not admin
      if (user?.role !== 'admin') {
        const roleTypeMap = {
          hospital_admin: 'hospital',
          police_admin: 'police',
          fire_admin: 'fire',
        };
        const filterType = roleTypeMap[user?.role];
        if (filterType) {
          stationList = stationList.filter((s) => s.stationType === filterType);
        }
      }

      setInstitutions(stationList);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
      setError('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  // Handle map location select
  const handleLocationSelect = (lat, lng) => {
    setForm({ ...form, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
  };

  // Add vehicle
  const handleAddVehicle = () => {
    const newVehicle = {
      id: Date.now(),
      vehicleType: VEHICLE_TYPES[form.stationType][0],
      driverId: '',
      driverName: '',
    };
    setVehicles([...vehicles, newVehicle]);
  };

  // Remove vehicle
  const handleRemoveVehicle = (id) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  // Update vehicle
  const handleUpdateVehicle = (id, field, value) => {
    setVehicles(
      vehicles.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Validate coordinates
  const isValidCoordinates = () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      setError('Institution name is required');
      return;
    }
    if (!isValidCoordinates()) {
      setError('Please select a valid location on the map');
      return;
    }
    if (form.stationType === 'hospital' && (!form.totalBeds || form.totalBeds < 0)) {
      setError('Please enter valid bed capacity');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Create station
      const stationPayload = {
        name: form.name.trim(),
        stationType: form.stationType,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        address: form.address.trim() || `${form.name}, ${form.region}`,
        region: form.region.trim(),
        contactPhone: form.contactPhone.trim(),
      };

      if (form.stationType === 'hospital') {
        stationPayload.totalBeds = parseInt(form.totalBeds) || 100;
        stationPayload.availableBeds = parseInt(form.availableBeds) || form.totalBeds;
      }

      const { data: stationData } = await dispatchAPI.post('/stations', stationPayload);
      const stationId = stationData._id;

      // Create vehicles
      let vehicleCount = 0;
      let vehicleErrors = 0;

      for (const vehicle of vehicles) {
        try {
          const vehiclePayload = {
            vehicleType: vehicle.vehicleType,
            serviceId: `${form.stationType.toUpperCase()}-${Date.now()}-${vehicleCount}`,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            driverId: vehicle.driverId.trim() || `DRV-${Date.now()}-${vehicleCount}`,
            driverName: vehicle.driverName.trim() || 'Unassigned',
          };

          await dispatchAPI.post('/vehicles/register', vehiclePayload);
          vehicleCount++;
        } catch (err) {
          console.error('Vehicle creation error:', err);
          vehicleErrors++;
        }
      }

      // Success message
      let msg = `Institution "${form.name}" created successfully`;
      if (vehicleCount > 0) {
        msg += ` with ${vehicleCount} vehicle${vehicleCount !== 1 ? 's' : ''}`;
      }
      if (vehicleErrors > 0) {
        msg += `. Warning: ${vehicleErrors} vehicle${vehicleErrors !== 1 ? 's' : ''} failed to create.`;
      }

      setSuccess(msg);

      // Reset form
      setForm({
        name: '',
        stationType: 'hospital',
        address: '',
        region: '',
        contactPhone: '',
        latitude: '',
        longitude: '',
        totalBeds: 100,
        availableBeds: 80,
      });
      setVehicles([]);

      // Refresh institutions list
      await fetchInstitutions();

      // Clear messages after 5s
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        'Failed to create institution';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const typeColors = {
    police: 'bg-blue-900/30 text-blue-300',
    fire: 'bg-red-900/30 text-red-300',
    hospital: 'bg-green-900/30 text-green-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <HiBuildingOffice2 className="w-6 h-6 text-green-400" />
        <h1 className="text-2xl font-bold text-slate-200">
          Manage Emergency Institutions
        </h1>
      </div>

      {/* Create Form with Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <HiPlus className="w-4 h-4" />
            Create New Institution
          </h2>

          {success && (
            <div className="mb-4 px-4 py-3 bg-green-900/40 border border-green-700/60 rounded-lg text-green-300 text-sm flex items-start gap-2">
              <HiExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700/60 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <HiExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div>
              <label className="label">Institution Name *</label>
              <input
                type="text"
                placeholder="Korle Bu Teaching Hospital"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type *</label>
                <select
                  value={form.stationType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stationType: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="hospital">Hospital</option>
                  <option value="police">Police Station</option>
                  <option value="fire">Fire Station</option>
                </select>
              </div>

              <div>
                <label className="label">Region</label>
                <input
                  type="text"
                  placeholder="Accra"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input
                type="text"
                placeholder="Street address or location"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Contact Phone</label>
              <input
                type="tel"
                placeholder="+233 30 266 4550"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="input"
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude *</label>
                <input
                  type="number"
                  placeholder="e.g., 5.5494"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="input"
                  step="0.0001"
                  min="-90"
                  max="90"
                  required
                />
              </div>
              <div>
                <label className="label">Longitude *</label>
                <input
                  type="number"
                  placeholder="e.g., -0.1960"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="input"
                  step="0.0001"
                  min="-180"
                  max="180"
                  required
                />
              </div>
            </div>

            {/* Hospital - Bed Capacity */}
            {form.stationType === 'hospital' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Beds</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={form.totalBeds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        totalBeds: e.target.value,
                        availableBeds: Math.min(
                          e.target.value,
                          form.availableBeds
                        ),
                      })
                    }
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Available Beds</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={form.availableBeds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        availableBeds: Math.min(
                          e.target.value,
                          form.totalBeds
                        ),
                      })
                    }
                    className="input"
                    min="0"
                    max={form.totalBeds}
                  />
                </div>
              </div>
            )}

            {/* Vehicles Section */}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300">Vehicles</h3>
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                >
                  <HiPlus className="w-3 h-3" />
                  Add Vehicle
                </button>
              </div>

              {vehicles.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  No vehicles added yet. Click "Add Vehicle" to include vehicles.
                </p>
              ) : (
                <div className="space-y-3">
                  {vehicles.map((vehicle, idx) => (
                    <div
                      key={vehicle.id}
                      className="bg-slate-700/30 p-3 rounded border border-slate-600 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">
                          Vehicle {idx + 1} ({VEHICLE_TYPES[form.stationType][0]})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(vehicle.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <HiTrash className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Driver ID"
                          value={vehicle.driverId}
                          onChange={(e) =>
                            handleUpdateVehicle(
                              vehicle.id,
                              'driverId',
                              e.target.value
                            )
                          }
                          className="input text-xs py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Driver Name"
                          value={vehicle.driverName}
                          onChange={(e) =>
                            handleUpdateVehicle(
                              vehicle.id,
                              'driverName',
                              e.target.value
                            )
                          }
                          className="input text-xs py-1.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <HiPlus className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Institution'}
            </button>
          </form>
        </div>

        {/* Map Section */}
        <div className="card !p-0 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h3 className="font-semibold text-slate-200 text-sm">
              Select Location
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Search or click on map to place marker
            </p>
          </div>
          <div className="flex-1 p-5">
            <MapPicker
              onLocationSelect={handleLocationSelect}
              initialLat={form.latitude ? parseFloat(form.latitude) : 5.6037}
              initialLng={form.longitude ? parseFloat(form.longitude) : -0.187}
              markerColor={form.stationType || 'fire'}
              height="450px"
            />
          </div>
        </div>
      </div>

      {/* Institutions List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200">
            Existing Institutions ({institutions.length})
          </h2>
          <button
            onClick={fetchInstitutions}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <HiArrowPath className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <Spinner center />
        ) : institutions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No institutions found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Region</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {institutions.map((inst) => (
                  <tr key={inst._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="table-cell font-medium">{inst.name}</td>
                    <td className="table-cell">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          typeColors[inst.stationType] ||
                          'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {inst.stationType}
                      </span>
                    </td>
                    <td className="table-cell text-slate-400">
                      {inst.region || 'N/A'}
                    </td>
                    <td className="table-cell text-slate-400 text-xs">
                      {inst.contactPhone || 'N/A'}
                    </td>
                    <td className="table-cell text-slate-400 text-xs">
                      {inst.latitude?.toFixed(4)}, {inst.longitude?.toFixed(4)}
                    </td>
                    <td className="table-cell">
                      <Badge
                        label={inst.isActive ? 'Active' : 'Inactive'}
                        bg={inst.isActive ? 'bg-green-600' : 'bg-slate-600'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
