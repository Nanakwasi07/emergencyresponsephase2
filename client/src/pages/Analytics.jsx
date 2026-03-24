import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  HiClipboardDocumentList,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import { analyticsAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import Spinner from '../components/Spinner.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
  },
};

const TYPE_COLORS = {
  robbery: '#a855f7',
  assault: '#ef4444',
  fire: '#f97316',
  medical: '#22c55e',
  accident: '#eab308',
};

const VEH_COLORS = {
  available: '#22c55e',
  dispatched: '#eab308',
  on_scene: '#f97316',
  in_transit: '#3b82f6',
  unavailable: '#ef4444',
};

const ROLE_FOCUS = {
  hospital_admin: { incidentTypes: ['medical', 'accident'], vehicleTypes: ['ambulance'] },
  police_admin: { incidentTypes: ['robbery', 'assault'], vehicleTypes: ['police_car'] },
  fire_admin: { incidentTypes: ['fire'], vehicleTypes: ['fire_truck'] },
  admin: { incidentTypes: null, vehicleTypes: null },
};

export default function Analytics() {
  const { user } = useAuth();
  const focus = ROLE_FOCUS[user?.role] || ROLE_FOCUS.admin;

  const [dashboard, setDashboard] = useState(null);
  const [responseTimes, setResponseTimes] = useState(null);
  const [byRegion, setByRegion] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [d, r, reg, u] = await Promise.all([
          analyticsAPI.get('/analytics/dashboard'),
          analyticsAPI.get('/analytics/response-times'),
          analyticsAPI.get('/analytics/incidents-by-region'),
          analyticsAPI.get('/analytics/resource-utilization'),
        ]);
        setDashboard(d.data);
        setResponseTimes(r.data);
        setByRegion(reg.data);
        setUtilization(u.data);
      } catch (err) {
        setError('Failed to load analytics. Ensure the Analytics service is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner center />;

  if (error) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <HiExclamationTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500/60" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const s = dashboard?.summary;
  const incTypes = dashboard?.incidentsByType || {};

  const chartIncTypes = focus.incidentTypes
    ? Object.fromEntries(Object.entries(incTypes).filter(([k]) => focus.incidentTypes.includes(k)))
    : incTypes;

  const incByTypeData = {
    labels: Object.keys(chartIncTypes).map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      label: 'Incidents',
      data: Object.values(chartIncTypes),
      backgroundColor: Object.keys(chartIncTypes).map((k) => (TYPE_COLORS[k] || '#64748b') + 'aa'),
      borderColor: Object.keys(chartIncTypes).map((k) => TYPE_COLORS[k] || '#64748b'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const statusKeys = ['available', 'dispatched', 'on_scene', 'in_transit', 'unavailable'];
  const statusValues = statusKeys.map((k) => utilization?.[k] || 0);
  const vUtilData = {
    labels: statusKeys.map((k) => k.replace('_', ' ')),
    datasets: [{
      data: statusValues,
      backgroundColor: statusKeys.map((k) => (VEH_COLORS[k] || '#64748b') + 'cc'),
      borderColor: statusKeys.map((k) => VEH_COLORS[k] || '#64748b'),
      borderWidth: 1,
    }],
  };

  const rtByType = responseTimes?.averageByType || {};
  const rtChartTypes = focus.incidentTypes
    ? Object.fromEntries(Object.entries(rtByType).filter(([k]) => focus.incidentTypes.includes(k)))
    : rtByType;
  const rtData = {
    labels: Object.keys(rtChartTypes).map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      label: 'Avg Response Time (min)',
      data: Object.values(rtChartTypes),
      backgroundColor: '#3b82f6aa',
      borderColor: '#3b82f6',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const vByType = utilization?.byType || {};
  const vByTypeFiltered = focus.vehicleTypes
    ? Object.fromEntries(Object.entries(vByType).filter(([k]) => focus.vehicleTypes.includes(k)))
    : vByType;
  const vTypeData = {
    labels: Object.keys(vByTypeFiltered).map((k) => k.replace('_', ' ')),
    datasets: [
      {
        label: 'Total',
        data: Object.values(vByTypeFiltered).map((v) => v.total),
        backgroundColor: '#06b6d4aa',
        borderColor: '#06b6d4',
        borderRadius: 4,
        borderWidth: 1,
      },
      {
        label: 'Available',
        data: Object.values(vByTypeFiltered).map((v) => v.available),
        backgroundColor: '#22c55eaa',
        borderColor: '#22c55e',
        borderRadius: 4,
        borderWidth: 1,
      },
      {
        label: 'Dispatched',
        data: Object.values(vByTypeFiltered).map((v) => v.dispatched),
        backgroundColor: '#eab308aa',
        borderColor: '#eab308',
        borderRadius: 4,
        borderWidth: 1,
      },
    ],
  };

  const regions = Object.entries(byRegion?.regions || {})
    .sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Operational metrics · {byRegion?.totalIncidents || 0} total incidents recorded
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiClipboardDocumentList} label="Total Incidents" value={s?.totalIncidents} color="blue" />
        <StatCard
          icon={HiCheckCircle}
          label="Resolved"
          value={s?.resolvedIncidents}
          color="green"
          sub={s?.totalIncidents
            ? `${Math.round((s.resolvedIncidents / s.totalIncidents) * 100)}% resolution rate`
            : undefined}
        />
        <StatCard icon={HiExclamationCircle} label="Open" value={s?.openIncidents} color="red" />
        <StatCard
          icon={HiClock}
          label="Avg Response"
          value={s?.averageResponseTime ? `${s.averageResponseTime} min` : 'N/A'}
          color="yellow"
          sub={`based on ${responseTimes?.resolvedIncidents || 0} resolved`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">Incidents by Type</h2>
          <div style={{ height: 240 }}>
            <Bar
              data={incByTypeData}
              options={{
                ...CHART_DEFAULTS,
                plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
              }}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">Vehicle Status Distribution</h2>
          <div style={{ height: 240 }} className="flex items-center justify-center">
            <Doughnut
              data={vUtilData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 },
                  },
                  tooltip: CHART_DEFAULTS.plugins.tooltip,
                },
                cutout: '65%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">
            Avg Response Time by Type (minutes)
          </h2>
          <div style={{ height: 240 }}>
            {Object.keys(rtChartTypes).length > 0 ? (
              <Bar
                data={rtData}
                options={{
                  ...CHART_DEFAULTS,
                  plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No resolved incidents yet
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">
            Resource Utilization by Vehicle Type
          </h2>
          <div style={{ height: 240 }}>
            {Object.keys(vByTypeFiltered).length > 0 ? (
              <Bar data={vTypeData} options={CHART_DEFAULTS} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No vehicle data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incidents by region table */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4 text-sm">
          Incidents by Ghana Region ({regions.length} regions active)
        </h2>
        {regions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No regional data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">#</th>
                  <th className="table-header">Region</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Robbery</th>
                  <th className="table-header">Assault</th>
                  <th className="table-header">Fire</th>
                  <th className="table-header">Medical</th>
                  <th className="table-header">Accident</th>
                  <th className="table-header">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {regions.map(([region, data], i) => {
                  const maxTotal = regions[0]?.[1]?.total || 1;
                  const intensity = data.total / maxTotal;
                  return (
                    <tr key={region} className="hover:bg-slate-700/30 transition-colors">
                      <td className="table-cell text-slate-500">{i + 1}</td>
                      <td className="table-cell font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-6 rounded-full bg-blue-500"
                            style={{ opacity: 0.3 + intensity * 0.7 }}
                          />
                          {region}
                        </div>
                      </td>
                      <td className="table-cell font-bold text-slate-100">{data.total}</td>
                      <td className="table-cell text-purple-300">{data.byType?.robbery || 0}</td>
                      <td className="table-cell text-red-300">{data.byType?.assault || 0}</td>
                      <td className="table-cell text-orange-300">{data.byType?.fire || 0}</td>
                      <td className="table-cell text-green-300">{data.byType?.medical || 0}</td>
                      <td className="table-cell text-yellow-300">{data.byType?.accident || 0}</td>
                      <td className="table-cell text-green-400">{data.byStatus?.Resolved || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
