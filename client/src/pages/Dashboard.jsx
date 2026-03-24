import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiClipboardDocumentList,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
  HiTruck,
  HiCheckBadge,
  HiArrowPath,
  HiXCircle,
  HiExclamationTriangle,
  HiSignal,
  HiMapPin,
  HiChartBar,
  HiChevronRight,
} from 'react-icons/hi2';
import {
  MdLocalHospital,
  MdLocalPolice,
  MdLocalFireDepartment,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsAPI, authAPI } from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';

const ROLE_CONFIG = {
  admin: {
    title: 'System Overview',
    quickLinks: [
      { to: '/incidents', icon: HiExclamationTriangle, label: 'Report Incident' },
      { to: '/dispatch', icon: HiSignal, label: 'Dispatch Board' },
      { to: '/tracking', icon: HiMapPin, label: 'Live Tracking' },
      { to: '/analytics', icon: HiChartBar, label: 'Analytics' },
    ],
  },
  hospital_admin: {
    title: 'Hospital Operations',
    quickLinks: [
      { to: '/incidents', icon: MdLocalHospital, label: 'Medical Incidents' },
      { to: '/tracking', icon: MdLocalHospital, label: 'Track Ambulances' },
      { to: '/analytics', icon: HiChartBar, label: 'Medical Analytics' },
    ],
  },
  police_admin: {
    title: 'Police Command',
    quickLinks: [
      { to: '/incidents', icon: MdLocalPolice, label: 'Crime Incidents' },
      { to: '/dispatch', icon: HiSignal, label: 'Dispatch Board' },
      { to: '/tracking', icon: MdLocalPolice, label: 'Track Police Units' },
    ],
  },
  fire_admin: {
    title: 'Fire Service Command',
    quickLinks: [
      { to: '/incidents', icon: MdLocalFireDepartment, label: 'Fire Incidents' },
      { to: '/tracking', icon: MdLocalFireDepartment, label: 'Track Fire Trucks' },
      { to: '/analytics', icon: HiChartBar, label: 'Response Analytics' },
    ],
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.admin;

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes] = await Promise.all([analyticsAPI.get('/analytics/dashboard')]);
        setStats(dashRes.data);
        if (user?.role === 'admin') {
          const usersRes = await authAPI.get('/auth/users');
          setUsers(usersRes.data.users || []);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <Spinner center />;

  const s = stats?.summary;
  const v = stats?.vehicleStatus;
  const t = stats?.incidentsByType;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{config.title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Welcome back, <span className="text-blue-400">{user?.name}</span>
          </p>
        </div>
        <span className="text-xs text-slate-500">
          {new Date().toLocaleString('en-GH', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiClipboardDocumentList} label="Total Incidents" value={s?.totalIncidents} color="blue" />
        <StatCard icon={HiCheckCircle} label="Resolved" value={s?.resolvedIncidents} color="green" />
        <StatCard icon={HiExclamationCircle} label="Open / Active" value={s?.openIncidents} color="red" />
        <StatCard
          icon={HiClock}
          label="Avg Response Time"
          value={s?.averageResponseTime ? `${s.averageResponseTime} min` : 'N/A'}
          color="yellow"
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiTruck} label="Total Vehicles" value={v?.total} color="cyan" />
        <StatCard icon={HiCheckBadge} label="Available" value={v?.available} color="green" />
        <StatCard icon={HiArrowPath} label="Deployed" value={v?.active} color="yellow" />
        <StatCard icon={HiXCircle} label="Unavailable" value={v?.unavailable} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents by type */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-200 mb-4">Incidents by Type</h2>
          {t ? (
            <div className="space-y-2">
              {Object.entries(t).map(([type, count]) => {
                const max = Math.max(...Object.values(t), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-slate-400 capitalize">{type}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-slate-300">{count}</span>
                    <Badge label={type} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No incident data yet.</p>
          )}
        </div>

        {/* Quick links */}
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {config.quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 transition-colors"
                >
                  <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-200">{link.label}</span>
                  <HiChevronRight className="ml-auto w-4 h-4 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin: User list */}
      {user?.role === 'admin' && users.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Registered Users ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="table-cell font-medium">{u.name}</td>
                    <td className="table-cell text-slate-400">{u.email}</td>
                    <td className="table-cell"><Badge label={u.role} /></td>
                    <td className="table-cell">
                      <Badge label={u.isActive ? 'available' : 'unavailable'} />
                    </td>
                    <td className="table-cell text-slate-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
