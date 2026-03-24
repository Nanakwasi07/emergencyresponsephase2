import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { HiExclamationTriangle, HiArrowPath, HiMapPin } from 'react-icons/hi2';
import { incidentAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';

// Fix Leaflet default icon in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// SVG pin icon (no emoji)
const pinIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <path fill="#ef4444" stroke="#fff" stroke-width="1"
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="#fff"/>
  </svg>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const ROLE_TYPES = {
  admin: ['robbery', 'assault', 'fire', 'medical', 'accident'],
  hospital_admin: ['medical', 'accident'],
  police_admin: ['robbery', 'assault'],
  fire_admin: ['fire', 'accident'],
};

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Incidents() {
  const { user } = useAuth();
  const allowedTypes = ROLE_TYPES[user?.role] || ROLE_TYPES.admin;

  const [form, setForm] = useState({
    citizenName: '',
    incidentType: allowedTypes[0],
    latitude: '',
    longitude: '',
    notes: '',
    adminId: user?._id || user?.userId || '',
  });
  const [pin, setPin] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await incidentAPI.get('/incidents/open');
      const all = data.incidents || data;
      const filtered =
        user?.role === 'admin'
          ? all
          : all.filter((i) => allowedTypes.includes(i.incidentType));
      setIncidents(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIncidents(false);
    }
  }, [user, allowedTypes]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleMapSelect = (lat, lng) => {
    const lat4 = parseFloat(lat.toFixed(4));
    const lng4 = parseFloat(lng.toFixed(4));
    setPin([lat4, lng4]);
    setForm((f) => ({ ...f, latitude: lat4, longitude: lng4 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      setError('Click on the map to select the incident location.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await incidentAPI.post('/incidents', {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        adminId: user?._id || user?.userId || 'system',
      });
      setSuccess('Incident reported. Nearest responder is being dispatched.');
      setForm({
        citizenName: '', incidentType: allowedTypes[0],
        latitude: '', longitude: '', notes: '', adminId: '',
      });
      setPin(null);
      fetchIncidents();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to report incident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Incident Reporting</h1>
        <p className="text-slate-400 text-sm mt-0.5">Click on the map to set the incident location</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">New Incident</h2>

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
            <div>
              <label className="label">Citizen Name</label>
              <input
                className="input"
                placeholder="Kwame Mensah"
                value={form.citizenName}
                onChange={(e) => setForm({ ...form, citizenName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Incident Type</label>
              <select
                className="input"
                value={form.incidentType}
                onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <div className="relative">
                  <HiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    className="input pl-9 bg-slate-600 cursor-default"
                    placeholder="Click map"
                    value={form.latitude}
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="label">Longitude</label>
                <div className="relative">
                  <HiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    className="input pl-9 bg-slate-600 cursor-default"
                    placeholder="Click map"
                    value={form.longitude}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Additional details about the incident…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={submitting}
            >
              <HiExclamationTriangle className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Report Incident'}
            </button>
          </form>
        </div>

        {/* Map */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
            <HiMapPin className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-slate-200 text-sm">
              Select Location — Click to drop pin
            </h2>
          </div>
          <div style={{ height: '440px' }}>
            <MapContainer
              center={[5.6037, -0.187]}
              zoom={11}
              style={{ height: '100%', width: '100%', background: '#1e293b' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={handleMapSelect} />
              {pin && (
                <Marker position={pin} icon={pinIcon}>
                  <Popup>
                    <div className="text-slate-900">
                      <strong>Selected Location</strong>
                      <br />
                      Lat: {pin[0]}, Lon: {pin[1]}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Open incidents table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200">Open Incidents</h2>
          <button
            onClick={fetchIncidents}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <HiArrowPath className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loadingIncidents ? (
          <Spinner center />
        ) : incidents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No open incidents.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">Citizen</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Assigned Unit</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="table-cell font-medium">{inc.citizenName}</td>
                    <td className="table-cell"><Badge label={inc.incidentType} /></td>
                    <td className="table-cell"><Badge label={inc.status} /></td>
                    <td className="table-cell text-slate-400">
                      {inc.assignedUnit?.vehicleType
                        ? <Badge label={inc.assignedUnit.vehicleType} />
                        : '—'}
                    </td>
                    <td className="table-cell text-slate-400 font-mono text-xs">
                      {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                    </td>
                    <td className="table-cell text-slate-400">
                      {new Date(inc.createdAt).toLocaleString('en-GH', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
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
