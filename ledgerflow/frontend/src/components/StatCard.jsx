import React from 'react';

const colorMap = {
  green:  { bg: 'bg-green-500/20',  icon: 'text-green-300',  border: 'border-green-400/30' },
  red:    { bg: 'bg-red-500/20',    icon: 'text-red-300',    border: 'border-red-400/30' },
  brand:  { bg: 'bg-blue-500/20',   icon: 'text-blue-300',   border: 'border-blue-400/30' },
  amber:  { bg: 'bg-amber-500/20',  icon: 'text-amber-300',  border: 'border-amber-400/30' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand' }) {
  const c = colorMap[color] || colorMap.brand;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg border ${c.bg} ${c.border} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
