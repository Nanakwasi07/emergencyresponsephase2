import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HiHome,
  HiExclamationTriangle,
  HiSignal,
  HiMapPin,
  HiChartBar,
  HiArrowRightOnRectangle,
  HiUser,
} from 'react-icons/hi2';
import { MdCrisisAlert } from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
  { to: '/incidents', icon: HiExclamationTriangle, label: 'Incidents' },
  { to: '/dispatch', icon: HiSignal, label: 'Dispatch' },
  { to: '/tracking', icon: HiMapPin, label: 'Live Tracking' },
  { to: '/analytics', icon: HiChartBar, label: 'Analytics' },
];

const ROLE_LABELS = {
  admin: 'System Admin',
  hospital_admin: 'Hospital Admin',
  police_admin: 'Police Admin',
  fire_admin: 'Fire Service Admin',
};

const ROLE_COLORS = {
  admin: 'bg-purple-600/20 text-purple-300 border-purple-600/40',
  hospital_admin: 'bg-green-600/20 text-green-300 border-green-600/40',
  police_admin: 'bg-blue-600/20 text-blue-300 border-blue-600/40',
  fire_admin: 'bg-red-600/20 text-red-300 border-red-600/40',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-800 border-r border-slate-700">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <MdCrisisAlert className="w-7 h-7 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-100 leading-tight">Emergency</p>
              <p className="text-xs text-slate-400 leading-tight">Response Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-700 space-y-3">
          <div className="flex items-start gap-2.5 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HiUser className="w-4 h-4 text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              <span
                className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  ROLE_COLORS[user?.role] || 'bg-slate-700 text-slate-300'
                }`}
              >
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <HiArrowRightOnRectangle className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
