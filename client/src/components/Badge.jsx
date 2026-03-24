const STATUS_COLORS = {
  // Incident statuses
  Created: 'bg-slate-600 text-slate-200',
  Dispatched: 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50',
  'In Progress': 'bg-orange-600/30 text-orange-300 border border-orange-600/50',
  Resolved: 'bg-green-600/30 text-green-300 border border-green-600/50',
  // Vehicle statuses
  available: 'bg-green-600/30 text-green-300 border border-green-600/50',
  dispatched: 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50',
  on_scene: 'bg-orange-600/30 text-orange-300 border border-orange-600/50',
  in_transit: 'bg-blue-600/30 text-blue-300 border border-blue-600/50',
  unavailable: 'bg-red-600/30 text-red-300 border border-red-600/50',
  // Types
  robbery: 'bg-purple-600/30 text-purple-300',
  assault: 'bg-red-600/30 text-red-300',
  fire: 'bg-orange-600/30 text-orange-300',
  medical: 'bg-green-600/30 text-green-300',
  accident: 'bg-yellow-600/30 text-yellow-300',
  // Vehicle types
  ambulance: 'bg-green-600/30 text-green-300',
  police_car: 'bg-blue-600/30 text-blue-300',
  fire_truck: 'bg-red-600/30 text-red-300',
};

export default function Badge({ label, type }) {
  const classes = STATUS_COLORS[label] || STATUS_COLORS[type] || 'bg-slate-600 text-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
