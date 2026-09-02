import React, { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Loader, Search, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const emptyForm = { name: '', description: '', price: '', stock: '', unit: 'pcs', hsn_code: '', gst_rate: '18' };
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const GST_RATES = ['0', '0.25', '5', '12', '18', '28'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/products').then(r => { setProducts(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => { const q = search.toLowerCase(); setFiltered(products.filter(p => p.name.toLowerCase().includes(q))); }, [search, products]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, unit: p.unit, hsn_code: p.hsn_code || '', gst_rate: p.gst_rate || '18' }); setError(''); setModal(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else await api.post('/products', form);
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save product.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); load(); }
    catch (err) { alert(err.response?.data?.message || 'Cannot delete — may be used in invoices.'); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Products & Services</h1><p className="page-subtitle">What you sell to your customers</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add Product</button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input className="input pl-9 text-sm" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><Package size={36} className="text-white/20 mb-3" /><p className="text-white/60">{search ? 'No products match' : 'No products yet'}</p>{!search && <button onClick={openCreate} className="btn-primary mt-4"><Plus size={15} /> Add Product</button>}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="th">Product / Service</th>
                <th className="th hidden md:table-cell">HSN Code</th>
                <th className="th">GST%</th>
                <th className="th-right">Price</th>
                <th className="th">Stock</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="tr-body">
                  <td className="td font-medium text-white">{p.name}{p.description && <p className="text-xs text-white/40 truncate max-w-xs">{p.description}</p>}</td>
                  <td className="td text-white/50 hidden md:table-cell font-mono text-xs">{p.hsn_code || '—'}</td>
                  <td className="td"><span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">{p.gst_rate}%</span></td>
                  <td className="td-right font-semibold text-white tabular-nums">{fmt(p.price)}</td>
                  <td className="td"><span className={`flex items-center gap-1 text-sm ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-white/60'}`}>{(p.stock === 0 || p.stock <= 5) && <AlertCircle size={12} />}{p.stock} {p.unit}</span></td>
                  <td className="td"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(p)} className="btn-ghost p-1.5"><Pencil size={13} /></button><button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="text-sm font-semibold text-white">{editing ? 'Edit Product' : 'New Product'}</h2><button onClick={() => setModal(false)} className="text-white/40 hover:text-white"><X size={17} /></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert-danger"><span>{error}</span></div>}
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
                  <div><label className="input-label">Price (₹) *</label><input type="number" step="0.01" min="0" className="input" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required /></div>
                  <div><label className="input-label">Stock Qty</label><input type="number" min="0" className="input" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
                </div>
                <div><label className="input-label">Unit</label><select className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>{['pcs','kg','ltr','hr','month','box','set'].map(u => <option key={u}>{u}</option>)}</select></div>
              </div>
              <div className="modal-footer"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving && <Loader size={13} className="animate-spin" />}{editing ? 'Save Changes' : 'Add Product'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
