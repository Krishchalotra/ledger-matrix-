import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Trash2, X, Loader, Search } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Travel', 'Office Supplies', 'Software', 'Maintenance', 'Food & Entertainment', 'Other'];
const emptyForm = { category: CATEGORIES[0], description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
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
    try { await api.post('/expenses', form); setModal(false); setForm(emptyForm); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to save expense.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${id}`); load(); }
    catch { alert('Failed to delete expense.'); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Money going out of your business</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(''); setModal(true); }} className="btn-primary">
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Summary strip */}
      <div className="card flex items-center justify-between py-4">
        <div>
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">{fmt(totalSpent)}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
          <Receipt size={18} className="text-red-500" />
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9 text-sm" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Receipt size={36} className="text-ink-300 mb-3" />
          <p className="text-ink-600 font-medium">{search ? 'No expenses match your search' : 'No expenses recorded yet'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="th">Description</th>
                <th className="th hidden sm:table-cell">Category</th>
                <th className="th hidden md:table-cell">Date</th>
                <th className="th-right">Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="tr-body">
                  <td className="td font-medium text-ink-800">{e.description}</td>
                  <td className="td hidden sm:table-cell">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-ink-100 text-ink-600">{e.category}</span>
                  </td>
                  <td className="td text-ink-500 hidden md:table-cell">{fmtDate(e.expense_date)}</td>
                  <td className="td-right font-semibold text-red-600 tabular-nums">{fmt(e.amount)}</td>
                  <td className="td">
                    <div className="flex justify-end">
                      <button onClick={() => handleDelete(e.id)} className="btn-ghost p-1.5 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-ink-900">Record Expense</h2>
              <button onClick={() => setModal(false)} className="text-ink-400 hover:text-ink-700"><X size={17} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert-danger"><span>{error}</span></div>}
                <div>
                  <label className="input-label">Category *</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Description *</label>
                  <input className="input" placeholder="e.g. Office rent for June"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Amount (₹) *</label>
                    <input type="number" step="0.01" min="0.01" className="input"
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="input-label">Date</label>
                    <input type="date" className="input"
                      value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader size={13} className="animate-spin" />}
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
