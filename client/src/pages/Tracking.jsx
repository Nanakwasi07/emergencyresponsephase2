import { useEffect, useRef, useState, useCallback } from 'react';
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

// Red pin for simulated incident location
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

// Random locations across Ghana for simulation
const GHANA_LOCATIONS = [
  { lat: 5.6037, lon: -0.1870, name: 'Accra Central' },
  { lat: 5.5502, lon: -0.2174, name: 'Tema' },
  { lat: 6.6885, lon: -1.6244, name: 'Kumasi' },
  { lat: 5.1053, lon: -1.2466, name: 'Cape Coast' },
  { lat: 9.4008, lon: -0.8393, name: 'Tamale' },
  { lat: 7.7408, lon: -2.0243, name: 'Sunyani' },
  { lat: 5.7585, lon: -0.2168, name: 'Accra North' },
  { lat: 6.0136, lon: -0.2672, name: 'Koforidua' },
  { lat: 5.6310, lon: -0.0673, name: 'Tema Industrial' },
  { lat: 5.9003, lon: -0.1872, name: 'Achimota' },
];

// Component that exposes map ref to parent
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
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
  const [simIncidentType, setSimIncidentType] = useState('fire');
  const [simStatus, setSimStatus] = useState('idle'); // idle | running | arrived | error
  const [simMessage, setSimMessage] = useState('');
  const [simStep, setSimStep] = useState(0);
  const [simTotal] = useState(12);
  const [simTarget, setSimTarget] = useState(null);     // { lat, lon, name }
  const [simVehicleId, setSimVehicleId] = useState(null);
  const simIntervalRef = useRef(null);

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

  // ── Simulation logic ───────────────────────────────────────────────────────
  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setSimStatus('idle');
    setSimStep(0);
    setSimTarget(null);
    setSimVehicleId(null);
    setSimMessage('');
  }, []);

  const startSimulation = useCallback(async () => {
    const neededVehicleType = INCIDENT_TO_VEHICLE[simIncidentType];
    const vehicleList = Object.values(vehicles);
    const candidate = vehicleList.find(
      (v) => v.vehicleType === neededVehicleType && v.latitude != null
    );

    if (!candidate) {
      setSimStatus('error');
      setSimMessage(
        `No registered ${neededVehicleType.replace('_', ' ')} with a known location. Register one via the Dispatch API first.`
      );
      return;
    }

    // Pick a random Ghana location as the incident site
    const target = GHANA_LOCATIONS[Math.floor(Math.random() * GHANA_LOCATIONS.length)];
    setSimTarget(target);
    setSimVehicleId(candidate._id);
    setSimStatus('running');
    setSimStep(0);
    setSimMessage(`${neededVehicleType.replace('_', ' ')} responding to ${simIncidentType} at ${target.name}`);

    // Fly map to midpoint
    if (mapRef.current) {
      const midLat = (candidate.latitude + target.lat) / 2;
      const midLon = (candidate.longitude + target.lon) / 2;
      mapRef.current.flyTo([midLat, midLon], 11, { duration: 1.5 });
    }

    // Create real incident in backend (fire and forget)
    incidentAPI.post('/incidents', {
      citizenName: 'Simulation Test',
      incidentType: simIncidentType,
      latitude: target.lat,
      longitude: target.lon,
      notes: `[SIMULATED] ${simIncidentType} incident at ${target.name}`,
      adminId: user?._id || user?.userId || 'simulation',
    }).catch(() => {});

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
        setSimStatus('arrived');
        setSimMessage(`${neededVehicleType.replace('_', ' ')} arrived at ${target.name}`);
      }
    }, 1500);
  }, [simIncidentType, vehicles, simTotal, user]);

  // Clean up on unmount
  useEffect(() => () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
  }, []);

  const vehicleList = Object.values(vehicles);
  const simVehicleType = INCIDENT_TO_VEHICLE[simIncidentType];

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
              {/* Incident type selector */}
              <div>
                <label className="label text-xs">Incident Type</label>
                <select
                  className="input text-sm"
                  value={simIncidentType}
                  onChange={(e) => setSimIncidentType(e.target.value)}
                  disabled={simStatus === 'running'}
                >
                  {['fire', 'medical', 'accident', 'robbery', 'assault'].map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto vehicle type */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg text-xs text-slate-300">
                {(() => {
                  const Icon = VEHICLE_ICONS_REACT[simVehicleType] || MdLocalHospital;
                  return <Icon className={`w-4 h-4 flex-shrink-0 ${VEHICLE_COLORS[simVehicleType]}`} />;
                })()}
                <span>Dispatches: <strong className="text-slate-100">{simVehicleType?.replace('_', ' ')}</strong></span>
              </div>

              {/* Status / progress */}
              {simStatus === 'running' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-xs text-yellow-300 font-medium">SIMULATING</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{simMessage}</p>
                  {/* Progress bar */}
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
                <div className="px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg">
                  <p className="text-xs text-green-300 font-medium flex items-center gap-1.5">
                    <HiExclamationTriangle className="w-3.5 h-3.5 text-green-400" />
                    {simMessage}
                  </p>
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
              ) : (
                <button
                  onClick={startSimulation}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                  style={{ background: simStatus === 'running' ? undefined : '#ca8a04' }}
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
                <Marker
                  key={v._id}
                  position={[v.latitude, v.longitude]}
                  icon={vehicleMapIcon(v.vehicleType, isSimActive)}
                >
                  <Popup>
                    <div className="text-slate-900 text-sm min-w-[170px]">
                      <div className="font-bold text-base mb-2 capitalize">
                        {v.vehicleType?.replace('_', ' ')}
                        {isSimActive && <span className="ml-1 text-yellow-600 text-xs">[SIM]</span>}
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr><td className="text-slate-500 pr-2 py-0.5">Status</td><td className="font-medium">{v.status}</td></tr>
                          <tr><td className="text-slate-500 pr-2 py-0.5">Driver</td><td>{v.driverName || 'N/A'}</td></tr>
                          <tr><td className="text-slate-500 pr-2 py-0.5">Lat</td><td className="font-mono">{v.latitude?.toFixed(5)}</td></tr>
                          <tr><td className="text-slate-500 pr-2 py-0.5">Lon</td><td className="font-mono">{v.longitude?.toFixed(5)}</td></tr>
                          {v.lastLocationUpdate && (
                            <tr>
                              <td className="text-slate-500 pr-2 py-0.5">Updated</td>
                              <td>{new Date(v.lastLocationUpdate).toLocaleTimeString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Simulated incident pin */}
          {simTarget && (simStatus === 'running' || simStatus === 'arrived') && (
            <Marker position={[simTarget.lat, simTarget.lon]} icon={incidentPinIcon}>
              <Popup>
                <div className="text-slate-900 text-sm">
                  <div className="font-bold mb-1 text-red-600">Incident Site</div>
                  <p className="text-xs">{simTarget.name}</p>
                  <p className="text-xs capitalize mt-0.5 text-slate-500">{simIncidentType} incident</p>
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
