export default function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
