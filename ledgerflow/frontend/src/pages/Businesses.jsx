import React, { useEffect, useState, useRef } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Loader, Star, Upload, Image } from 'lucide-react';
import api from '../api/axios';

const empty = { name: '', gstin: '', address: '', state_code: '', phone: '', email: '', logo_url: '' };

export default function Businesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get('/businesses').then(r => setBusinesses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModal(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, gstin: b.gstin || '', address: b.address || '', state_code: b.state_code || '', phone: b.phone || '', email: b.email || '', logo_url: b.logo_url || '' });
    setError(''); setModal(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }

    setUploading(true);
    try {
      // Convert to base64 data URL (stored directly - no external service needed)
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(p => ({ ...p, logo_url: ev.target.result }));
        setUploading(false);
      };
      reader.onerror = () => { setError('Failed to read image.'); setUploading(false); };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Upload failed.'); setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put('/businesses/' + editing.id, form);
      else await api.post('/businesses', form);
      setModal(false); load();
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="page-title">Business Profiles</h1>
          <p className="page-subtitle">Manage your business entities for invoicing</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">Add Business</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : businesses.length === 0 ? (
        <div className="card empty-state">
          <Building2 size={36} className="text-white/20 mb-3" />
          <p className="text-white/60 font-medium">No business profiles yet</p>
          <p className="text-white/30 text-sm mt-1">Add your business to appear on invoices and PDFs</p>
          <button onClick={openCreate} className="btn-primary mt-4"><Plus size={15} /> Add Business</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map(b => (
            <div key={b.id} className={'card relative ' + (b.is_default ? 'border-blue-400/40' : '')}>
              {b.is_default && <span className="absolute top-3 right-3 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-medium">Default</span>}
              <div className="flex items-start gap-3 mb-3">
                {/* Logo display */}
                {b.logo_url ? (
                  <img src={b.logo_url} alt="Logo" className="w-14 h-14 rounded-lg object-contain bg-white/10 border border-white/20 flex-shrink-0 p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-blue-300" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-white text-base">{b.name}</h3>
                  {b.gstin && <p className="text-xs font-mono text-white/50 mt-0.5">GSTIN: {b.gstin}</p>}
                </div>
              </div>
              {b.address && <p className="text-xs text-white/40 mb-1">{b.address}</p>}
              {b.phone && <p className="text-xs text-white/40">{b.phone}</p>}
              {b.email && <p className="text-xs text-white/40">{b.email}</p>}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                {!b.is_default && <button onClick={() => setDefault(b.id)} className="btn-ghost text-xs flex items-center gap-1 text-white/40 hover:text-amber-400"><Star size={12} /> Set Default</button>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => openEdit(b)} className="btn-ghost p-1.5"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(b.id)} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-white">{editing ? 'Edit Business' : 'New Business Profile'}</h2>
              <button onClick={() => setModal(false)} className="text-white/40 hover:text-white"><X size={17} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert-danger"><span>{error}</span></div>}

                {/* Logo Upload */}
                <div>
                  <label className="input-label">Business Logo</label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Image size={28} className="text-white/20" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {/* File upload */}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                      >
                        {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Processing...' : 'Upload Logo'}
                      </button>
                      {/* Or paste URL */}
                      <input
                        className="input text-xs"
                        placeholder="Or paste image URL (https://...)"
                        value={form.logo_url.startsWith('data:') ? '' : form.logo_url}
                        onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
                      />
                      <p className="text-xs text-white/30">PNG, JPG or SVG. Max 2MB. Shown on PDF invoices.</p>
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
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader size={13} className="animate-spin" />}{editing ? 'Save Changes' : 'Add Business'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}