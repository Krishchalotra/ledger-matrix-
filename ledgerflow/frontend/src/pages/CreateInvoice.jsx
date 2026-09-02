import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Loader, FileText } from 'lucide-react';
import api from '../api/axios';
import Select from '../components/Select';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATES = [
  ['01','Jammu & Kashmir'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],
  ['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],['09','Uttar Pradesh'],
  ['10','Bihar'],['11','Sikkim'],['12','Arunachal Pradesh'],['13','Nagaland'],['14','Manipur'],
  ['15','Mizoram'],['16','Tripura'],['17','Meghalaya'],['18','Assam'],['19','West Bengal'],
  ['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],['24','Gujarat'],
  ['26','Dadra & Nagar Haveli and Daman & Diu'],['27','Maharashtra'],['28','Andhra Pradesh'],
  ['29','Karnataka'],['30','Goa'],['31','Lakshadweep'],['32','Kerala'],['33','Tamil Nadu'],
  ['34','Puducherry'],['35','Andaman & Nicobar Islands'],['36','Telangana'],['37','Andhra Pradesh (New)'],
];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState({ customer_id: '', due_date: '', supply_type: 'intra', place_of_supply: '', notes: '', business_id: '' });
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/customers'), api.get('/products'), api.get('/businesses')]).then(([c, p, b]) => {
      setCustomers(c.data); setProducts(p.data); setBusinesses(b.data);
      const def = b.data.find(biz => biz.is_default);
      if (def) setForm(f => ({ ...f, business_id: String(def.id) }));
    });
    const d = new Date(); d.setDate(d.getDate() + 30);
    setForm(f => ({ ...f, due_date: d.toISOString().split('T')[0] }));
  }, []);

  const addItem = () => setItems(i => [...i, { product_id: '', quantity: 1 }]);
  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, field, value) => setItems(i => i.map((it, j) => j === idx ? { ...it, [field]: value } : it));
  const getProduct = (id) => products.find(p => String(p.id) === String(id));

  const subtotal = items.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? parseFloat(p.price) * parseInt(item.quantity || 0) : 0);
  }, 0);

  const gstBreakdown = items.reduce((acc, item) => {
    const p = getProduct(item.product_id);
    if (!p) return acc;
    const lineTotal = parseFloat(p.price) * parseInt(item.quantity || 0);
    const gst = (lineTotal * parseFloat(p.gst_rate || 18)) / 100;
    if (form.supply_type === 'intra') { acc.cgst += gst / 2; acc.sgst += gst / 2; }
    else { acc.igst += gst; }
    return acc;
  }, { cgst: 0, sgst: 0, igst: 0 });
  const totalTax = gstBreakdown.cgst + gstBreakdown.sgst + gstBreakdown.igst;
  const total = subtotal + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.business_id) { setError('Please select a business.'); return; }
    if (!form.customer_id) { setError('Please select a customer.'); return; }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one product.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/invoices', {
        customer_id: parseInt(form.customer_id),
        due_date: form.due_date,
        supply_type: form.supply_type,
        place_of_supply: form.place_of_supply || null,
        notes: form.notes,
        business_id: parseInt(form.business_id),
        items: validItems.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity) })),
      });
      navigate('/invoices');
    } catch (err) { setError(err.response?.data?.message || 'Failed to create invoice.'); }
    finally { setSaving(false); }
  };

  // Option arrays for Select
  const bizOptions = businesses.map(b => ({ value: String(b.id), label: b.name + (b.gstin ? ` — ${b.gstin}` : '') }));
  const custOptions = customers.map(c => ({ value: String(c.id), label: c.name + (c.gstin ? ` — ${c.gstin}` : '') }));
  const stateOptions = STATES.map(([code, name]) => ({ value: code, label: `${code} — ${name}` }));
  const supplyOptions = [
    { value: 'intra', label: 'Intra-State (CGST + SGST)' },
    { value: 'inter', label: 'Inter-State (IGST)' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5"><ArrowLeft size={17} /></button>
        <div><h1 className="page-title">New Invoice</h1><p className="page-subtitle">Create a GST-compliant invoice</p></div>
      </div>

      {error && <div className="alert-danger"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Invoice Details */}
        <div className="card">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="input-label">Business (From) *</label>
              <Select
                options={bizOptions}
                value={form.business_id}
                onChange={v => setForm(f => ({ ...f, business_id: v }))}
                placeholder="Select business..."
              />
              {businesses.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">⚠ Add a business profile first in Businesses page</p>
              )}
            </div>

            <div>
              <label className="input-label">Customer (To) *</label>
              <Select
                options={custOptions}
                value={form.customer_id}
                onChange={v => setForm(f => ({ ...f, customer_id: v }))}
                placeholder="Select customer..."
              />
            </div>

            <div>
              <label className="input-label">Due Date *</label>
              <input type="date" className="input" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
            </div>

            <div>
              <label className="input-label">Supply Type</label>
              <Select
                options={supplyOptions}
                value={form.supply_type}
                onChange={v => setForm(f => ({ ...f, supply_type: v }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="input-label">Place of Supply</label>
              <Select
                options={stateOptions}
                value={form.place_of_supply}
                onChange={v => setForm(f => ({ ...f, place_of_supply: v }))}
                placeholder="Search state..."
                searchable
              />
            </div>

          </div>
        </div>

        {/* Line Items */}
        <div className="card">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Line Items</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-white/30 uppercase tracking-wider pb-2 border-b border-white/10">
              <div className="col-span-5">Product</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">GST</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, idx) => {
              const p = getProduct(item.product_id);
              const lineTotal = p ? parseFloat(p.price) * parseInt(item.quantity || 0) : 0;
              const gst = p ? (lineTotal * parseFloat(p.gst_rate || 18)) / 100 : 0;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select
                      options={products.map(pr => ({
                        value: String(pr.id),
                        label: `${pr.name} — ${fmt(pr.price)} (${pr.gst_rate}% GST)`
                      }))}
                      value={String(item.product_id)}
                      onChange={v => updateItem(idx, 'product_id', v)}
                      placeholder="Select product..."
                      searchable
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="1" className="input text-sm text-center" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm text-white/60 tabular-nums">{p ? fmt(gst) : '—'}</p>
                    {p && <p className="text-xs text-white/30">{p.gst_rate}%</p>}
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-white tabular-nums">{p ? fmt(lineTotal + gst) : '—'}</p>
                    {p && <p className="text-xs text-white/30">{fmt(p.price)} × {item.quantity}</p>}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="btn-ghost p-1 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addItem} className="mt-4 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium">
            <Plus size={14} /> Add item
          </button>
        </div>

        {/* Notes + Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <label className="input-label">Notes (optional)</label>
            <textarea className="input resize-none text-sm" rows={4}
              placeholder="Payment terms, bank details, thank you note..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="card">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white tabular-nums">{fmt(subtotal)}</span>
              </div>
              {form.supply_type === 'intra' ? (
                <>
                  <div className="flex justify-between"><span className="text-white/50">CGST</span><span className="text-white tabular-nums">{fmt(gstBreakdown.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">SGST</span><span className="text-white tabular-nums">{fmt(gstBreakdown.sgst)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-white/50">IGST</span><span className="text-white tabular-nums">{fmt(gstBreakdown.igst)}</span></div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-white tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-6">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <><Loader size={15} className="animate-spin" /> Creating...</> : <><FileText size={15} /> Create Invoice</>}
          </button>
        </div>
      </form>
    </div>
  );
}
