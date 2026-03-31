import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  HiArrowPath,
  HiPlay,
  HiStop,
  HiChevronDown,
  HiChevronUp,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import {
  MdLocalHospital,
  MdLocalPolice,
  MdLocalFireDepartment,
} from 'react-icons/md';
import { dispatchAPI, incidentAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket } from '../services/socket.js';
import Badge from '../components/Badge.jsx';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;

// ── SVG-based map markers (no emoji) ─────────────────────────────────────────

const SVG_ICONS = {
  ambulance: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="#16a34a" stroke="#fff" stroke-width="2"/>
    <rect x="16" y="9" width="4" height="18" rx="1" fill="#fff"/>
    <rect x="9" y="16" width="18" height="4" rx="1" fill="#fff"/>
  </svg>`,
  police_car: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="#2563eb" stroke="#fff" stroke-width="2"/>
    <polygon points="18,8 21,15 29,15 23,20 25,28 18,23 11,28 13,20 7,15 15,15" fill="#fff"/>
  </svg>`,
  fire_truck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="#dc2626" stroke="#fff" stroke-width="2"/>
    <path d="M18 8 C16 12 12 14 12 18 C12 21 14 23 16 24 C14 22 14 20 16 19 C16 22 17 24 18 26 C19 24 20 22 20 19 C22 20 22 22 20 24 C22 23 24 21 24 18 C24 14 20 12 18 8Z" fill="#fff"/>
  </svg>`,
};

// Red pin for incident location
const INCIDENT_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0 C5.37 0 0 5.37 0 12 C0 21 12 36 12 36 S24 21 24 12 C24 5.37 18.63 0 12 0Z" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="4" fill="#fff"/>
</svg>`;

const vehicleMapIcon = (type, isSimulating = false) =>
  L.divIcon({
    html: `<div style="filter:${isSimulating ? 'drop-shadow(0 0 6px #facc15)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}">${SVG_ICONS[type] || SVG_ICONS.ambulance}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

const incidentPinIcon = L.divIcon({
  html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 8px #ef4444)">${INCIDENT_PIN_SVG}</div>`,
  className: '',
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_VEHICLE_TYPES = {
  admin: null,
  hospital_admin: ['ambulance'],
  police_admin: ['police_car'],
  fire_admin: ['fire_truck'],
};

const ROLE_INCIDENT_TYPES = {
  admin: null,
  hospital_admin: ['medical', 'accident'],
  police_admin: ['robbery', 'assault'],
  fire_admin: ['fire', 'accident'],
};

const VEHICLE_ICONS_REACT = {
  ambulance: MdLocalHospital,
  police_car: MdLocalPolice,
  fire_truck: MdLocalFireDepartment,
};

const VEHICLE_COLORS = {
  ambulance: 'text-green-400',
  police_car: 'text-blue-400',
  fire_truck: 'text-red-400',
};

// Incident type → vehicle type (matches backend helpers.js)
const INCIDENT_TO_VEHICLE = {
  fire: 'fire_truck',
  medical: 'ambulance',
  accident: 'ambulance',
  robbery: 'police_car',
  assault: 'police_car',
};

// Component that exposes map ref to parent
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// Memoized vehicle marker component
function VehicleMarker({ vehicle, isSimActive }) {
  const icon = useMemo(
    () => vehicleMapIcon(vehicle.vehicleType, isSimActive),
    [vehicle.vehicleType, isSimActive]
  );

  return (
    <Marker
      position={[vehicle.latitude, vehicle.longitude]}
      icon={icon}
    >
      <Popup>
        <div className="text-slate-900 text-sm min-w-[170px]">
          <div className="font-bold text-base mb-2 capitalize">
            {vehicle.vehicleType?.replace('_', ' ')}
            {isSimActive && <span className="ml-1 text-yellow-600 text-xs">[SIM]</span>}
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="text-slate-500 pr-2 py-0.5">Status</td><td className="font-medium">{vehicle.status}</td></tr>
              <tr><td className="text-slate-500 pr-2 py-0.5">Driver</td><td>{vehicle.driverName || 'N/A'}</td></tr>
              <tr><td className="text-slate-500 pr-2 py-0.5">Lat</td><td className="font-mono">{vehicle.latitude?.toFixed(5)}</td></tr>
              <tr><td className="text-slate-500 pr-2 py-0.5">Lon</td><td className="font-mono">{vehicle.longitude?.toFixed(5)}</td></tr>
              {vehicle.lastLocationUpdate && (
                <tr>
                  <td className="text-slate-500 pr-2 py-0.5">Updated</td>
                  <td>{new Date(vehicle.lastLocationUpdate).toLocaleTimeString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Tracking() {
  const { user } = useAuth();
  const allowedTypes = ROLE_VEHICLE_TYPES[user?.role];

  const [vehicles, setVehicles] = useState({});
  const [connected, setConnected] = useState(false);
  const mapRef = useRef(null);

  // ── Simulation state ───────────────────────────────────────────────────────
  const [simOpen, setSimOpen] = useState(false);
  const [simStatus, setSimStatus] = useState('idle'); // idle | running | arrived | error
  const [simMessage, setSimMessage] = useState('');
  const [simStep, setSimStep] = useState(0);
  const [simTotal] = useState(12);
  const [simTarget, setSimTarget] = useState(null);     // { lat, lon, name }
  const [simVehicleId, setSimVehicleId] = useState(null);
  const [simIncidentId, setSimIncidentId] = useState(null);
  const simIntervalRef = useRef(null);
  // Refs so stopSimulation can access current IDs without stale closure
  const simVehicleIdRef = useRef(null);
  const simIncidentIdRef = useRef(null);

  // ── Open incidents state ───────────────────────────────────────────────────
  const [openIncidents, setOpenIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // ── Fetch vehicles ─────────────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await dispatchAPI.get('/vehicles');
      const all = data.vehicles || data;
      const filtered = allowedTypes
        ? all.filter((v) => allowedTypes.includes(v.vehicleType))
        : all;
      const map = {};
      filtered.forEach((v) => { map[v._id] = v; });
      setVehicles(map);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  }, [allowedTypes]);

  // ── Fetch open incidents ───────────────────────────────────────────────────
  const fetchOpenIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    setIncidentsError('');
    try {
      const { data } = await incidentAPI.get('/incidents/open');
      const all = Array.isArray(data) ? data : (data.incidents || []);
      const allowedIncTypes = ROLE_INCIDENT_TYPES[user?.role];
      const filtered = allowedIncTypes
        ? all.filter((i) => allowedIncTypes.includes(i.incidentType))
        : all;
      setOpenIncidents(filtered);
    } catch (err) {
      setIncidentsError('Could not load incidents.');
      console.error('Failed to fetch open incidents:', err);
    } finally {
      setIncidentsLoading(false);
    }
  }, [user]);

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchVehicles();
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    setConnected(socket.connected);

    const onLocation = ({ vehicleId, latitude, longitude, status }) => {
      setVehicles((prev) => {
        if (!prev[vehicleId]) return prev;
        if (allowedTypes && !allowedTypes.includes(prev[vehicleId]?.vehicleType)) return prev;
        return {
          ...prev,
          [vehicleId]: { ...prev[vehicleId], latitude, longitude, status, lastLocationUpdate: new Date() },
        };
      });
    };

    const onDispatched = ({ vehicleId }) => {
      setVehicles((prev) => {
        if (!prev[vehicleId]) return prev;
        return { ...prev, [vehicleId]: { ...prev[vehicleId], status: 'dispatched' } };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('vehicle:location', onLocation);
    socket.on('vehicle:dispatched', onDispatched);

    const interval = setInterval(fetchVehicles, 60000);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('vehicle:location', onLocation);
      socket.off('vehicle:dispatched', onDispatched);
      clearInterval(interval);
    };
  }, [fetchVehicles, allowedTypes]);

  // Fetch open incidents whenever the panel is opened
  useEffect(() => {
    if (!simOpen) return;
    setSelectedIncident(null);
    fetchOpenIncidents();
  }, [simOpen, fetchOpenIncidents]);

  // ── Simulation logic ───────────────────────────────────────────────────────
  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    const vehicleId = simVehicleIdRef.current;
    const incidentId = simIncidentIdRef.current;

    if (vehicleId) {
      dispatchAPI.put(`/vehicles/${vehicleId}/status`, { status: 'available' }).catch(() => {});
      setVehicles((prev) => {
        if (!prev[vehicleId]) return prev;
        return { ...prev, [vehicleId]: { ...prev[vehicleId], status: 'available' } };
      });
    }
    if (incidentId) {
      incidentAPI.put(`/incidents/${incidentId}/status`, { status: 'Resolved' }).catch(() => {});
    }

    simVehicleIdRef.current = null;
    simIncidentIdRef.current = null;
    setSimStatus('idle');
    setSimStep(0);
    setSimTarget(null);
    setSimVehicleId(null);
    setSimIncidentId(null);
    setSimMessage('');
  }, []);

  const startSimulation = useCallback(async () => {
    if (!selectedIncident) {
      setSimStatus('error');
      setSimMessage('Please select an incident to respond to.');
      return;
    }

    if (!selectedIncident.latitude || !selectedIncident.longitude) {
      setSimStatus('error');
      setSimMessage('Selected incident has no location data.');
      return;
    }

    const neededVehicleType = INCIDENT_TO_VEHICLE[selectedIncident.incidentType];
    const vehicleList = Object.values(vehicles);
    const candidate = vehicleList.find(
      (v) => v.vehicleType === neededVehicleType && v.latitude != null
    );

    if (!candidate) {
      setSimStatus('error');
      setSimMessage(
        `No ${neededVehicleType.replace('_', ' ')} with a known location is available for this incident.`
      );
      return;
    }

    const target = {
      lat: selectedIncident.latitude,
      lon: selectedIncident.longitude,
      name: `${selectedIncident.incidentType} — ${selectedIncident.citizenName}`,
    };

    setSimTarget(target);
    setSimVehicleId(candidate._id);
    simVehicleIdRef.current = candidate._id;
    setSimIncidentId(selectedIncident._id);
    simIncidentIdRef.current = selectedIncident._id;
    setSimStatus('running');
    setSimStep(0);
    setSimMessage(`${neededVehicleType.replace('_', ' ')} responding to ${selectedIncident.incidentType} — ${selectedIncident.citizenName}`);

    // Fly map to midpoint
    if (mapRef.current) {
      const midLat = (candidate.latitude + target.lat) / 2;
      const midLon = (candidate.longitude + target.lon) / 2;
      mapRef.current.flyTo([midLat, midLon], 11, { duration: 1.5 });
    }

    // Mark vehicle dispatched and incident Dispatched
    try {
      await dispatchAPI.put(`/vehicles/${candidate._id}/status`, {
        status: 'dispatched',
        incidentId: selectedIncident._id,
      });
      setVehicles((prev) => ({
        ...prev,
        [candidate._id]: { ...prev[candidate._id], status: 'dispatched' },
      }));
    } catch (err) {
      console.warn('Simulate vehicle dispatch failed:', err.message);
    }

    incidentAPI.put(`/incidents/${selectedIncident._id}/status`, { status: 'Dispatched' }).catch(() => {});

    // Interpolate vehicle position over simTotal steps
    const startLat = candidate.latitude;
    const startLon = candidate.longitude;
    let step = 0;

    simIntervalRef.current = setInterval(async () => {
      step += 1;
      const t = step / simTotal;
      const lat = parseFloat((startLat + (target.lat - startLat) * t).toFixed(6));
      const lon = parseFloat((startLon + (target.lon - startLon) * t).toFixed(6));

      try {
        await dispatchAPI.post(`/vehicles/${candidate._id}/location`, {
          latitude: lat,
          longitude: lon,
        });
      } catch (err) {
        console.warn('Simulate location update failed:', err.message);
      }

      setSimStep(step);

      if (step >= simTotal) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;

        // Mark vehicle on_scene and incident In Progress
        dispatchAPI.put(`/vehicles/${candidate._id}/status`, { status: 'on_scene' })
          .then(() => {
            setVehicles((prev) => ({
              ...prev,
              [candidate._id]: { ...prev[candidate._id], status: 'on_scene' },
            }));
          })
          .catch(() => {});
        incidentAPI.put(`/incidents/${selectedIncident._id}/status`, { status: 'In Progress' }).catch(() => {});

        setSimStatus('arrived');
        setSimMessage(`${neededVehicleType.replace('_', ' ')} arrived at ${selectedIncident.citizenName}'s location`);
      }
    }, 1500);
  }, [selectedIncident, vehicles, simTotal]);

  // Clean up on unmount
  useEffect(() => () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
  }, []);

  const vehicleList = Object.values(vehicles);
  const simVehicleType = selectedIncident ? INCIDENT_TO_VEHICLE[selectedIncident.incidentType] : null;

  return (
    <div className="flex" style={{ height: '100vh' }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-slate-100 text-sm">Live Vehicle Tracking</h1>
            <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{vehicleList.length} vehicles tracked</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 border-b border-slate-700 text-center">
          {['available', 'dispatched', 'on_scene'].map((s) => (
            <div key={s} className="py-2 border-r last:border-0 border-slate-700">
              <p className="text-lg font-bold text-slate-100">
                {vehicleList.filter((v) => v.status === s).length}
              </p>
              <p className="text-xs text-slate-500 capitalize leading-tight">{s.replace('_', ' ')}</p>
            </div>
          ))}
        </div>

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto py-1">
          {vehicleList.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-8 px-4">
              No vehicles available for your role.
            </p>
          ) : (
            vehicleList.map((v) => {
              const Icon = VEHICLE_ICONS_REACT[v.vehicleType] || MdLocalHospital;
              const isSimActive = simStatus === 'running' && v._id === simVehicleId;
              return (
                <button
                  key={v._id}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 ${isSimActive ? 'bg-yellow-500/5' : ''}`}
                  onClick={() => {
                    if (v.latitude && mapRef.current) {
                      mapRef.current.flyTo([v.latitude, v.longitude], 14, { duration: 1 });
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <Icon className={`w-5 h-5 ${VEHICLE_COLORS[v.vehicleType] || 'text-slate-400'}`} />
                      {isSimActive && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge label={v.vehicleType} />
                        <Badge label={v.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {v.driverName || 'No driver assigned'}
                      </p>
                      {v.latitude ? (
                        <p className="text-xs text-slate-500 font-mono">
                          {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600">No location data</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Simulate Panel ───────────────────────────────────────────── */}
        <div className="border-t border-slate-700">
          {/* Toggle header */}
          <button
            onClick={() => setSimOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HiPlay className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-slate-200">Simulate Incident</span>
            </div>
            {simOpen
              ? <HiChevronDown className="w-4 h-4 text-slate-400" />
              : <HiChevronUp className="w-4 h-4 text-slate-400" />}
          </button>

          {simOpen && (
            <div className="px-4 pb-4 space-y-3">

              {/* Incident selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs">Open Incident</label>
                  <button
                    onClick={fetchOpenIncidents}
                    disabled={incidentsLoading || simStatus === 'running'}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 disabled:opacity-40"
                  >
                    <HiArrowPath className={`w-3 h-3 ${incidentsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {incidentsLoading ? (
                  <p className="text-xs text-slate-400 py-2">Loading incidents…</p>
                ) : incidentsError ? (
                  <p className="text-xs text-red-400 py-2">{incidentsError}</p>
                ) : openIncidents.length === 0 ? (
                  <p className="text-xs text-slate-500 px-3 py-2 bg-slate-700/40 rounded-lg">
                    No open incidents for your role.
                  </p>
                ) : (
                  <select
                    className="input text-sm"
                    value={selectedIncident?._id || ''}
                    onChange={(e) => {
                      const inc = openIncidents.find((i) => i._id === e.target.value) || null;
                      setSelectedIncident(inc);
                    }}
                    disabled={simStatus === 'running'}
                  >
                    <option value="">— Choose an incident —</option>
                    {openIncidents.map((inc) => (
                      <option key={inc._id} value={inc._id}>
                        {inc.incidentType.toUpperCase()} · {inc.citizenName} · {inc.latitude?.toFixed(3)},{inc.longitude?.toFixed(3)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Auto vehicle type + incident status */}
              {selectedIncident && simVehicleType && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg text-xs text-slate-300">
                  {(() => {
                    const Icon = VEHICLE_ICONS_REACT[simVehicleType] || MdLocalHospital;
                    return <Icon className={`w-4 h-4 flex-shrink-0 ${VEHICLE_COLORS[simVehicleType]}`} />;
                  })()}
                  <span>Dispatches: <strong className="text-slate-100">{simVehicleType.replace('_', ' ')}</strong></span>
                  <span className="ml-auto text-slate-500 capitalize">{selectedIncident.status}</span>
                </div>
              )}

              {/* Status / progress */}
              {simStatus === 'running' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-xs text-yellow-300 font-medium">SIMULATING</p>
                    <span className="ml-auto px-1.5 py-0.5 bg-red-900/40 border border-red-700/50 rounded text-xs text-red-300 font-medium">
                      OPEN
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{simMessage}</p>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 bg-yellow-400 rounded-full transition-all duration-700"
                      style={{ width: `${(simStep / simTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Step {simStep} / {simTotal}
                  </p>
                </div>
              )}

              {simStatus === 'arrived' && (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg">
                    <p className="text-xs text-green-300 font-medium flex items-center gap-1.5">
                      <HiExclamationTriangle className="w-3.5 h-3.5 text-green-400" />
                      {simMessage}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Incident status: <span className="text-yellow-300 font-medium">In Progress</span>
                    </p>
                  </div>
                  <button
                    onClick={stopSimulation}
                    className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <HiStop className="w-3.5 h-3.5" />
                    Resolve &amp; Reset
                  </button>
                </div>
              )}

              {simStatus === 'error' && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg">
                  <p className="text-xs text-red-300 flex items-start gap-1.5">
                    <HiExclamationTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
                    {simMessage}
                  </p>
                </div>
              )}

              {/* Action button */}
              {simStatus === 'running' ? (
                <button
                  onClick={stopSimulation}
                  className="btn-danger w-full text-sm flex items-center justify-center gap-2"
                >
                  <HiStop className="w-4 h-4" />
                  Stop Simulation
                </button>
              ) : simStatus !== 'arrived' && (
                <button
                  onClick={startSimulation}
                  disabled={!selectedIncident || openIncidents.length === 0}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#ca8a04' }}
                >
                  <HiPlay className="w-4 h-4" />
                  Start Simulation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={fetchVehicles}
            className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <HiArrowPath className="w-3.5 h-3.5" />
            Refresh Positions
          </button>
        </div>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <MapContainer
          center={[7.9465, -1.0232]}
          zoom={7}
          style={{ height: '100%', width: '100%', background: '#1e293b' }}
        >
          <MapController mapRef={mapRef} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Vehicle markers */}
          {vehicleList
            .filter((v) => v.latitude != null && v.longitude != null)
            .map((v) => {
              const isSimActive = simStatus === 'running' && v._id === simVehicleId;
              return (
                <VehicleMarker
                  key={v._id}
                  vehicle={v}
                  isSimActive={isSimActive}
                  VEHICLE_COLORS={VEHICLE_COLORS}
                />
              );
            })}

          {/* Incident pin */}
          {simTarget && (simStatus === 'running' || simStatus === 'arrived') && (
            <Marker position={[simTarget.lat, simTarget.lon]} icon={incidentPinIcon}>
              <Popup>
                <div className="text-slate-900 text-sm">
                  <div className="font-bold mb-1 text-red-600">Incident Site</div>
                  <p className="text-xs">{selectedIncident?.citizenName}</p>
                  <p className="text-xs capitalize mt-0.5 text-slate-500">{selectedIncident?.incidentType} incident</p>
                  {simStatus === 'arrived' && (
                    <p className="text-xs text-green-600 font-medium mt-1">Responder on scene</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
