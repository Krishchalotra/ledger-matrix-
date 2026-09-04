import React, { useEffect, useState, useRef } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Loader, Star, Upload, Image } from 'lucide-react';
import api from '../api/axios';

const empty = { name: '', gstin: '', address: '', state_code: '', phone: '', email: '', logo_url: '' };

export default function Businesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get('/businesses').then(r => setBusinesses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setShowForm(true); };
  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, gstin: b.gstin||'', address: b.address||'', state_code: b.state_code||'', phone: b.phone||'', email: b.email||'', logo_url: b.logo_url||'' }); setError(''); setShowForm(true); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }
    setUploading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Compress image using canvas before storing
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max 200x200 for logo
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // Compress to JPEG quality 0.7 (reduces size by ~80%)
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        setForm(p => ({ ...p, logo_url: compressed }));
        setUploading(false);
      };
      img.onerror = () => { setError('Failed to process image.'); setUploading(false); };
      img.src = ev.target.result;
    };
    reader.onerror = () => { setError('Failed to read image.'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put('/businesses/' + editing.id, form);
      else await api.post('/businesses', form);
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const setDefault = async (id) => {
    try { await api.patch('/businesses/' + id + '/set-default'); load(); }
    catch { alert('Failed to set default.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this business profile?')) return;
    try { await api.delete('/businesses/' + id); load(); }
    catch (err) { alert(err.response?.data?.message || 'Cannot delete.'); }
  };

  if (showForm) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
          <div><h1 className="page-title">{editing ? 'Edit Business' : 'New Business Profile'}</h1></div>
        </div>
        {error && <div className="alert-danger"><span>{error}</span></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="input-label">Business Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" /> : <Image size={24} className="text-white/20" />}
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary w-full flex items-center justify-center gap-2">
                    {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Processing...' : 'Upload Logo'}
                  </button>
                  <input className="input text-xs" placeholder="Or paste image URL (https://...)" value={form.logo_url.startsWith('data:') ? '' : form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} />
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-xs text-white/60 font-medium mb-1">Logo Requirements:</p>
                    <ul className="text-xs text-white/40 space-y-0.5">
                      <li>Min size: 100 x 100 pixels</li>
                      <li>Ideal size: 200 x 200 pixels (square)</li>
                      <li>Max file size: 2MB</li>
                      <li>Formats: PNG, JPG, SVG</li>
                      <li>Square logo recommended for best PDF fit</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div><label className="input-label">Business Name *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><label className="input-label">GSTIN</label><input className="input font-mono uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="input-label">State Code</label><input className="input" placeholder="e.g. 27" maxLength={2} value={form.state_code} onChange={e => setForm(p => ({ ...p, state_code: e.target.value }))} /></div>
              <div><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label className="input-label">Address</label><textarea className="input resize-none" rows={3} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Loader size={13} className="animate-spin" />} {editing ? 'Save Changes' : 'Add Business'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="page-header">
        <div><h1 className="page-title">Business Profiles</h1><p className="page-subtitle">Manage your business entities for invoicing</p></div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0"><Plus size={15} /> <span className="hidden sm:inline">Add Business</span><span className="sm:hidden">Add</span></button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : businesses.length === 0 ? (
        <div className="card empty-state"><Building2 size={36} className="text-white/20 mb-3" /><p className="text-white/60 font-medium">No business profiles yet</p><p className="text-white/30 text-sm mt-1">Add your business to appear on invoices</p><button onClick={openCreate} className="btn-primary mt-4"><Plus size={15} /> Add Business</button></div>
      ) : (
        <div className="space-y-3">
          {businesses.map(b => (
            <div key={b.id} className={'card relative ' + (b.is_default ? 'border-blue-400/40' : '')}>
              {b.is_default && <span className="absolute top-3 right-3 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">Default</span>}
              <div className="flex items-start gap-3 mb-3">
                {b.logo_url ? <img src={b.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 border border-white/20 flex-shrink-0 p-1" /> : <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0"><Building2 size={20} className="text-blue-300" /></div>}
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{b.name}</h3>
                  {b.gstin && <p className="text-xs font-mono text-white/50 mt-0.5">GSTIN: {b.gstin}</p>}
                  {b.phone && <p className="text-xs text-white/40">{b.phone}</p>}
                </div>
              </div>
              {b.address && <p className="text-xs text-white/40 mb-3">{b.address}</p>}
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                {!b.is_default && <button onClick={() => setDefault(b.id)} className="btn-ghost text-xs flex items-center gap-1 hover:text-amber-400"><Star size={12} /> Set Default</button>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => openEdit(b)} className="btn-ghost p-2 text-xs flex items-center gap-1"><Pencil size={13} /> Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="btn-ghost p-2 text-xs flex items-center gap-1 hover:text-red-400"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}