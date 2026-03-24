import { useEffect, useState, useCallback } from 'react';
import {
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import {
  MdLocalHospital,
  MdLocalPolice,
  MdLocalFireDepartment,
} from 'react-icons/md';
import { incidentAPI, dispatchAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';

const NEXT_STATUS = {
  Created: 'In Progress',
  Dispatched: 'In Progress',
  'In Progress': 'Resolved',
};

const ROLE_TYPES = {
  admin: null,
  hospital_admin: ['medical', 'accident'],
  police_admin: ['robbery', 'assault'],
  fire_admin: ['fire', 'accident'],
};

const ROLE_VEHICLE_TYPES = {
  admin: null,
  hospital_admin: ['ambulance'],
  police_admin: ['police_car'],
  fire_admin: ['fire_truck'],
};

const VEHICLE_ICONS = {
  ambulance: MdLocalHospital,
  police_car: MdLocalPolice,
  fire_truck: MdLocalFireDepartment,
};

const VEHICLE_COLORS = {
  ambulance: 'text-green-400',
  police_car: 'text-blue-400',
  fire_truck: 'text-red-400',
};

export default function Dispatch() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingInc, setLoadingInc] = useState(true);
  const [loadingVeh, setLoadingVeh] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const allowedIncTypes = ROLE_TYPES[user?.role];
  const allowedVehTypes = ROLE_VEHICLE_TYPES[user?.role];

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await incidentAPI.get('/incidents/open');
      let all = data.incidents || data;
      if (allowedIncTypes) all = all.filter((i) => allowedIncTypes.includes(i.incidentType));
      setIncidents(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInc(false);
    }
  }, [allowedIncTypes]);

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await dispatchAPI.get('/vehicles');
      let all = data.vehicles || data;
      if (allowedVehTypes) all = all.filter((v) => allowedVehTypes.includes(v.vehicleType));
      setVehicles(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVeh(false);
    }
  }, [allowedVehTypes]);

  useEffect(() => {
    fetchIncidents();
    fetchVehicles();
    const iv = setInterval(() => {
      fetchIncidents();
      fetchVehicles();
    }, 20000);
    return () => clearInterval(iv);
  }, [fetchIncidents, fetchVehicles]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await incidentAPI.put(`/incidents/${id}/status`, { status });
      await fetchIncidents();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dispatch Board</h1>
          <p className="text-slate-400 text-sm mt-0.5">Active incidents and responder assignments</p>
        </div>
        <button
          onClick={() => { fetchIncidents(); fetchVehicles(); }}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <HiArrowPath className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Incidents */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Active Incidents</h2>
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
              {incidents.length} open
            </span>
          </div>

          {loadingInc ? (
            <Spinner center />
          ) : incidents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HiCheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600/40" />
              <p>No active incidents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => {
                const next = NEXT_STATUS[inc.status];
                const VehicleIcon = inc.assignedUnit?.vehicleType
                  ? VEHICLE_ICONS[inc.assignedUnit.vehicleType]
                  : null;
                return (
                  <div
                    key={inc._id}
                    className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-100">{inc.citizenName}</span>
                          <Badge label={inc.incidentType} />
                          <Badge label={inc.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(inc.createdAt).toLocaleString('en-GH', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {' · '}
                          {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                        </p>
                        {inc.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">"{inc.notes}"</p>
                        )}
                      </div>
                      {next && (
                        <button
                          onClick={() => updateStatus(inc._id, next)}
                          disabled={updatingId === inc._id}
                          className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          {updatingId === inc._id ? (
                            <HiArrowPath className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            `→ ${next}`
                          )}
                        </button>
                      )}
                    </div>

                    {inc.assignedUnit?.vehicleType ? (
                      <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-600/40 px-3 py-1.5 rounded-lg">
                        {VehicleIcon && (
                          <VehicleIcon className={`w-4 h-4 flex-shrink-0 ${VEHICLE_COLORS[inc.assignedUnit.vehicleType]}`} />
                        )}
                        <span className="font-medium">Responder:</span>
                        <Badge label={inc.assignedUnit.vehicleType} />
                        <span className="text-slate-400">
                          ID: {inc.assignedUnit.vehicleId?.slice(-6)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-700/40 px-3 py-1.5 rounded-lg">
                        <HiClock className="w-3.5 h-3.5" />
                        Awaiting responder assignment
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vehicle Fleet */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Vehicle Fleet</h2>
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
              {vehicles.filter((v) => v.status === 'available').length}/{vehicles.length} available
            </span>
          </div>

          {loadingVeh ? (
            <Spinner center />
          ) : vehicles.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No vehicles registered.</p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {vehicles.map((v) => {
                const Icon = VEHICLE_ICONS[v.vehicleType] || HiExclamationTriangle;
                const iconColor = VEHICLE_COLORS[v.vehicleType] || 'text-slate-400';
                return (
                  <div
                    key={v._id}
                    className="flex items-center gap-3 p-3 bg-slate-700/40 rounded-lg border border-slate-600/30"
                  >
                    <Icon className={`w-6 h-6 flex-shrink-0 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge label={v.vehicleType} />
                        <Badge label={v.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {v.driverName || `Driver: ${v.driverId || 'Unassigned'}`}
                      </p>
                      {v.latitude && (
                        <p className="text-xs text-slate-500 font-mono">
                          {v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
