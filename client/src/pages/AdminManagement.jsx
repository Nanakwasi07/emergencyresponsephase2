import { useEffect, useState, useCallback } from 'react';
import { HiUser, HiExclamationTriangle, HiTrash, HiPlus } from 'react-icons/hi2';
import { authAPI, dispatchAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import Badge from '../components/Badge.jsx';

export default function AdminManagement() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'hospital_admin',
    institutionId: '',
  });

  const [institutions, setInstitutions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch institutions and filter by role
  const fetchInstitutions = useCallback(async () => {
    try {
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
    }
  }, [user]);

  // Fetch existing admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.get('/auth/users');
      let adminList = Array.isArray(data) ? data : data.users || [];

      // Filter out non-admin roles for display (show only admin accounts)
      adminList = adminList.filter((u) =>
        ['admin', 'hospital_admin', 'police_admin', 'fire_admin'].includes(u.role)
      );

      setAdmins(adminList);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutions();
    fetchAdmins();
  }, [fetchAdmins, fetchInstitutions]);

  // Get institution name by ID
  const getInstitutionName = (id) => {
    const inst = institutions.find((i) => i._id === id);
    return inst?.name || 'Unknown';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      setError('Admin name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!form.institutionId) {
      setError('Please select an institution');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        role: form.role,
        institutionId: form.institutionId,
      };

      const { data } = await authAPI.post('/auth/register', payload);

      const institutionName = getInstitutionName(form.institutionId);
      setSuccess(
        `Admin "${form.name}" created and linked to ${institutionName}`
      );

      // Reset form
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'hospital_admin',
        institutionId: '',
      });

      // Refresh admins list
      await fetchAdmins();

      // Clear messages after 4s
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        'Failed to create admin';

      if (msg.includes('email') || msg.includes('duplicate')) {
        setError('Email already registered');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle admin deletion
  const handleDelete = async (adminId, adminName) => {
    if (!confirm(`Delete admin "${adminName}"? This cannot be undone.`)) {
      return;
    }

    try {
      // TODO: Add delete endpoint when available
      // For now, just show a message
      setError('Delete functionality not yet implemented');
    } catch (err) {
      setError('Failed to delete admin');
    }
  };

  const roleColors = {
    admin: 'bg-purple-900/30 text-purple-300',
    hospital_admin: 'bg-green-900/30 text-green-300',
    police_admin: 'bg-blue-900/30 text-blue-300',
    fire_admin: 'bg-red-900/30 text-red-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <HiUser className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-slate-200">Manage Emergency Admins</h1>
      </div>

      {/* Create Form */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <HiPlus className="w-4 h-4" />
          Create New Admin
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                placeholder="Dr. Kofi Mensah"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="kofi@hospital.gov.gh"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Admin Role</label>
              <select
                value={form.role}
                onChange={(e) => {
                  setForm({ ...form, role: e.target.value, institutionId: '' });
                }}
                className="input"
              >
                <option value="hospital_admin">Hospital Admin</option>
                <option value="police_admin">Police Admin</option>
                <option value="fire_admin">Fire Admin</option>
                {user?.role === 'admin' && (
                  <option value="admin">System Admin</option>
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Assign to Institution</label>
              <select
                value={form.institutionId}
                onChange={(e) =>
                  setForm({ ...form, institutionId: e.target.value })
                }
                className="input"
                required
              >
                <option value="">-- Select an Institution --</option>
                {institutions.map((inst) => (
                  <option key={inst._id} value={inst._id}>
                    {inst.name} ({inst.stationType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <HiPlus className="w-4 h-4" />
            {submitting ? 'Creating Admin...' : 'Create Admin'}
          </button>
        </form>
      </div>

      {/* Admins Table */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4">Existing Admins</h2>

        {loading ? (
          <Spinner center />
        ) : admins.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No admins found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="table-cell font-medium">{admin.name}</td>
                    <td className="table-cell text-slate-400">{admin.email}</td>
                    <td className="table-cell">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          roleColors[admin.role] || 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-slate-400">
                      {admin.institutionId
                        ? getInstitutionName(admin.institutionId)
                        : 'Not Assigned'}
                    </td>
                    <td className="table-cell">
                      <Badge
                        label={admin.isActive ? 'Active' : 'Inactive'}
                        bg={admin.isActive ? 'bg-green-500' : 'bg-slate-600'}
                      />
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(admin._id, admin.name)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete admin"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
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
