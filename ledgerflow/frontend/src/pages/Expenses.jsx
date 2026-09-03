import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Trash2, X, Loader, Search } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => 'Rs.' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Travel', 'Office Supplies', 'Software', 'Maintenance', 'Food & Entertainment', 'Other'];
const emptyForm = { category: CATEGORIES[0], description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const load = () => api.get('/expenses').then(r => { setExpenses(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(expenses.filter(e => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)));
  }, [search, expenses]);

  const handleSave = async (ev) => {
    ev.preventDefault(); setSaving(true); setError('');
    try { await api.post('/expenses', form); setShowForm(false); setForm(emptyForm); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to save expense.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.delete('/expenses/' + id); load(); }
    catch { alert('Failed to delete expense.'); }
  };

  if (showForm) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
          <div><h1 className="page-title">Record Expense</h1><p className="page-subtitle">Add a new expense entry</p></div>
        </div>
        {error && <div className="alert-danger"><span>{error}</span></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="input-label">Category *</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Description *</label>
              <input className="input" placeholder="e.g. Office rent for June" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Amount (Rs.) *</label>
                <input type="number" step="0.01" min="0.01" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="input-label">Date</label>
                <input type="date" className="input" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Loader size={13} className="animate-spin" />} Record Expense
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="page-header">
        <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">Money going out of your business</p></div>
        <button onClick={() => { setForm(emptyForm); setError(''); setShowForm(true); }} className="btn-primary flex-shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
        </button>
      </div>
      <div className="card flex items-center justify-between py-3">
        <div>
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-white tabular-nums">{fmt(totalSpent)}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-400/30 flex items-center justify-center">
          <Receipt size={18} className="text-red-400" />
        </div>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input className="input pl-9 text-sm" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><Receipt size={36} className="text-white/20 mb-3" /><p className="text-white/60">{search ? 'No expenses match' : 'No expenses yet'}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <div key={e.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{e.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/50">{e.category}</span>
                  <span className="text-xs text-white/30">{fmtDate(e.expense_date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="font-bold text-red-400 tabular-nums">{fmt(e.amount)}</p>
                <button onClick={() => handleDelete(e.id)} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}