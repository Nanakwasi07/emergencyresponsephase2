import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import Dispatch from './pages/Dispatch.jsx';
import Tracking from './pages/Tracking.jsx';
import Analytics from './pages/Analytics.jsx';
import AdminManagement from './pages/AdminManagement.jsx';
import InstitutionManagement from './pages/InstitutionManagement.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="tracking" element={<Tracking />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="manage-admins" element={<AdminManagement />} />
            <Route path="manage-institutions" element={<InstitutionManagement />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
