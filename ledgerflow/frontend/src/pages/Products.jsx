import React, { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Loader, Search, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const emptyForm = { name: '', description: '', price: '', stock: '', unit: 'pcs', hsn_code: '', gst_rate: '18' };
const fmt = (n) => 'Rs.' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const GST_RATES = ['0', '0.25', '5', '12', '18', '28'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/products').then(r => { setProducts(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter(p => p.name.toLowerCase().includes(q)));
  }, [search, products]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, description: p.description||'', price: p.price, stock: p.stock, unit: p.unit, hsn_code: p.hsn_code||'', gst_rate: String(p.gst_rate||'18') }); setError(''); setShowForm(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put('/products/' + editing.id, form);
      else await api.post('/products', form);
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete('/products/' + id); load(); }
    catch (err) { alert(err.response?.data?.message || 'Cannot delete.'); }
  };

  if (showForm) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
          <div><h1 className="page-title">{editing ? 'Edit Product' : 'New Product'}</h1></div>
        </div>
        {error && <div className="alert-danger"><span>{error}</span></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card space-y-4">
            <div><label className="input-label">Product / Service name *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><label className="input-label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="input-label">HSN Code</label><input className="input font-mono" placeholder="e.g. 998314" value={form.hsn_code} onChange={e => setForm(p => ({ ...p, hsn_code: e.target.value }))} /></div>
              <div><label className="input-label">GST Rate *</label>
                <select className="input" value={form.gst_rate} onChange={e => setForm(p => ({ ...p, gst_rate: e.target.value }))}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="input-label">Price (Rs.) *</label><input type="number" step="0.01" min="0" className="input" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required /></div>
              <div><label className="input-label">Stock Qty</label><input type="number" min="0" className="input" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
            </div>
            <div><label className="input-label">Unit</label>
              <select className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {['pcs','kg','ltr','hr','month','box','set'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Loader size={13} className="animate-spin" />} {editing ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="page-header">
        <div><h1 className="page-title">Products & Services</h1><p className="page-subtitle">What you sell to your customers</p></div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0"><Plus size={15} /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span></button>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input className="input pl-9 text-sm" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><Package size={36} className="text-white/20 mb-3" /><p className="text-white/60">{search ? 'No products match' : 'No products yet'}</p>{!search && <button onClick={openCreate} className="btn-primary mt-4"><Plus size={15} /> Add Product</button>}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{p.name}</p>
                  {p.description && <p className="text-xs text-white/40 truncate mt-0.5">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">{p.gst_rate}% GST</span>
                    {p.hsn_code && <span className="text-xs text-white/30 font-mono">HSN: {p.hsn_code}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-white tabular-nums">{fmt(p.price)}</p>
                    <p className={'text-xs ' + (p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-white/40')}>
                      {(p.stock === 0 || p.stock <= 5) && <AlertCircle size={10} className="inline mr-0.5" />}{p.stock} {p.unit}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                <button onClick={() => openEdit(p)} className="btn-ghost flex-1 justify-center text-xs"><Pencil size={13} /> Edit</button>
                <button onClick={() => handleDelete(p.id)} className="btn-ghost flex-1 justify-center text-xs hover:text-red-400"><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}