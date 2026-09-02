import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const statusBadge = (s) => {
  const map = { PAID: 'badge-paid', UNPAID: 'badge-unpaid', OVERDUE: 'badge-overdue', CANCELLED: 'badge-cancelled' };
  return <span className={map[s] || 'badge-unpaid'}>{s}</span>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-white/50 mb-0.5">{label}</p>
        <p className="font-semibold text-white">{fmt(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Here's your business summary for today.</p>
        </div>        <Link to="/invoices/new" className="btn-primary">
          <Plus size={15} /> New Invoice
        </Link>
      </div>

      {/* Overdue alert */}
      {stats?.overdueCount > 0 && (
        <div className="alert-danger">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">
            <span className="font-semibold">{stats.overdueCount} overdue invoice{stats.overdueCount > 1 ? 's' : ''}</span> require your attention.
          </span>
          <Link to="/invoices" className="font-medium underline underline-offset-2 whitespace-nowrap flex items-center gap-1">
            Review <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Revenue" value={fmt(stats?.totalRevenue)} subtitle="From paid invoices" icon={TrendingUp} color="green" />
        <StatCard title="Expenses" value={fmt(stats?.totalExpenses)} subtitle="Total outgoings" icon={TrendingDown} color="red" />
        <StatCard title="Net Profit" value={fmt(stats?.netProfit)} subtitle="Revenue minus expenses" icon={DollarSign} color="brand" />
        <StatCard title="Pending" value={fmt(stats?.unpaidTotal)} subtitle={`${stats?.unpaidCount || 0} unpaid`} icon={Clock} color="amber" />
      </div>

      {/* Chart + Recent Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Chart */}
        <div className="card xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue Trend</h2>
              <p className="text-xs text-white/40">Last 6 months</p>
            </div>
          </div>
          {stats?.monthlyRevenue?.length > 0 ? (            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={1.5}
                  fill="url(#revGrad)" dot={{ fill: '#2563eb', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-white/30 text-sm">
              No revenue data yet — mark invoices as paid to see the chart.
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Invoices</h2>
            <Link to="/invoices" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {stats?.recentInvoices?.length > 0 ? (
            <div className="divide-y divide-white/5">
              {stats.recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{inv.customer_name}</p>
                    <p className="text-xs text-white/40 font-mono">{inv.invoice_number}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-semibold text-white tabular-nums">{fmt(inv.total_amount)}</p>
                    {statusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state text-white/30 text-sm">No invoices yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
