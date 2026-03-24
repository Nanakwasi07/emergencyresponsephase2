import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEnvelope, HiLockClosed, HiShieldCheck } from 'react-icons/hi2';
import { MdCrisisAlert } from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';

const ROLE_HINTS = [
  { icon: HiShieldCheck, color: 'text-purple-400', role: 'Admin', desc: 'Full platform access' },
  { icon: HiShieldCheck, color: 'text-green-400', role: 'Hospital Admin', desc: 'Medical incidents & ambulance fleet' },
  { icon: HiShieldCheck, color: 'text-blue-400', role: 'Police Admin', desc: 'Crime incidents & police vehicles' },
  { icon: HiShieldCheck, color: 'text-red-400', role: 'Fire Admin', desc: 'Fire incidents & fire trucks' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-red-500/10 rounded-2xl">
              <MdCrisisAlert className="w-12 h-12 text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Emergency Response Platform</h1>
          <p className="text-slate-400 mt-1 text-sm">National Coordination System · Ghana</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700/60 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <HiEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="admin@emergency.gov.gh"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex justify-center items-center gap-2 mt-2"
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : <MdCrisisAlert className="w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Role hint */}
        <div className="mt-4 card">
          <p className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Role-based access
          </p>
          <div className="space-y-2">
            {ROLE_HINTS.map(({ icon: Icon, color, role, desc }) => (
              <div key={role} className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                <span className="text-xs text-slate-300">
                  <strong>{role}</strong>
                  <span className="text-slate-500"> — {desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
