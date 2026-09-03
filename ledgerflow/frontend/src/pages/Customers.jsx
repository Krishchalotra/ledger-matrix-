import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Loader, Search } from 'lucide-react';
import api from '../api/axios';

const emptyForm = { name: '', email: '', phone: '', address: '', gstin: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/customers').then(r => { setCustomers(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)));
  }, [search, customers]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email||'', phone: c.phone||'', address: c.address||'', gstin: c.gstin||'' }); setError(''); setShowForm(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put('/customers/' + editing.id, form);
      else await api.post('/customers', form);
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.delete('/customers/' + id); load(); }
    catch (err) { alert(err.response?.data?.message || 'Cannot delete.'); }
  };

  if (showForm) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
          <div><h1 className="page-title">{editing ? 'Edit Customer' : 'New Customer'}</h1></div>
        </div>
        {error && <div className="alert-danger"><span>{error}</span></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card space-y-4">
            <div><label className="input-label">Full name *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><label className="input-label">GSTIN</label><input className="input font-mono uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} /></div>
            <div><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label className="input-label">Address</label><textarea className="input resize-none" rows={3} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Loader size={13} className="animate-spin" />} {editing ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="page-header">
        <div><h1 className="page-title">Customers</h1><p className="page-subtitle">Manage your client list</p></div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0"><Plus size={15} /> <span className="hidden sm:inline">Add Customer</span><span className="sm:hidden">Add</span></button>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input className="input pl-9 text-sm" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><Users size={36} className="text-white/20 mb-3" /><p className="text-white/60">{search ? 'No customers match' : 'No customers yet'}</p>{!search && <button onClick={openCreate} className="btn-primary mt-4"><Plus size={15} /> Add Customer</button>}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 font-bold text-sm flex-shrink-0">{c.name[0].toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-white/40 truncate">{c.phone || c.email || '—'}</p>
                  {c.gstin && <p className="text-xs text-white/30 font-mono">{c.gstin}</p>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(c)} className="btn-ghost p-2"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="btn-ghost p-2 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}