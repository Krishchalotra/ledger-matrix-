import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, ChevronDown, Search, Trash2, Download, FileDown, CreditCard, Printer } from 'lucide-react';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

const fmt = (n) => 'Rs.' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const statusBadge = (s) => {
  const map = { PAID: 'badge-paid', UNPAID: 'badge-unpaid', OVERDUE: 'badge-overdue', CANCELLED: 'badge-cancelled' };
  return React.createElement('span', { className: map[s] || 'badge-unpaid' }, s);
};
const STATUSES = ['ALL', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'];
const API = 'https://ledger-matrix.onrender.com/api';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  const load = () => api.get('/invoices').then(r => setInvoices(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    let data = invoices;
    if (statusFilter !== 'ALL') data = data.filter(i => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(i => i.invoice_number.toLowerCase().includes(q) || i.customer_name?.toLowerCase().includes(q));
    }
    setFiltered(data);
  }, [invoices, search, statusFilter]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try { await api.patch(`/invoices/${id}/status`, { status }); load(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update status.'); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (id, num) => {
    if (!confirm('Delete invoice ' + num + '? This will restore product stock.')) return;
    try { await api.delete('/invoices/' + id); load(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete invoice.'); }
  };

  const fetchPDF = async (id) => {
    const token = localStorage.getItem('lf_token');
    const url = API + '/pdf/invoice/' + id;
    const headers = { Authorization: 'Bearer ' + token };
    // Try up to 3 times with 4 second gaps (for Render wake-up)
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(url, { headers });
        if (r.ok) return await r.blob();
        const errText = await r.text();
        throw new Error('HTTP ' + r.status + ': ' + errText);
      } catch (e) {
        if (i < 2) {
          await new Promise(res => setTimeout(res, 4000));
        } else {
          throw e;
        }
      }
    }
  };

  const downloadPDF = async (id, num) => {
    try {
      const blob = await fetchPDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = num + '.pdf'; a.click();
    } catch (e) {
      alert('PDF failed: ' + e.message + '\nThe server may be waking up. Please try again in 30 seconds.');
    }
  };

  const printInvoice = async (id, num) => {
    try {
      const blob = await fetchPDF(id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url);
      if (win) win.onload = () => { win.focus(); win.print(); };
    } catch (e) {
      alert('Print failed: ' + e.message + '\nThe server may be waking up. Please try again in 30 seconds.');
    }
  };

  const exportInvoices = (format) => {
    const token = localStorage.getItem('lf_token');
    fetch(API + '/export/invoices?format=' + format, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'invoices.' + format; a.click();
      }).catch(() => alert('Export failed. Server may be waking up, try again in 30s.'));
  };

  const exportGSTR1 = () => {
    const token = localStorage.getItem('lf_token');
    fetch(API + '/export/gstr1?format=xlsx', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'gstr1.xlsx'; a.click();
      }).catch(() => alert('Export failed. Server may be waking up, try again in 30s.'));
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Invoices</h1><p className="page-subtitle">Track payments from your customers</p></div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-1.5"><FileDown size={14} /> Export</button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-20 hidden group-hover:block py-1">
              <button onClick={() => exportInvoices('xlsx')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10">Excel (.xlsx)</button>
              <button onClick={() => exportInvoices('csv')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10">CSV (.csv)</button>
              <div className="border-t border-white/10 my-1" />
              <button onClick={exportGSTR1} className="w-full text-left px-4 py-2 text-sm text-cyan-400 hover:bg-white/10 font-medium">GSTR-1 Report</button>
            </div>
          </div>
          <Link to="/invoices/new" className="btn-primary"><Plus size={15} /> New Invoice</Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input className="input pl-9 text-sm" placeholder="Search invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' + (statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 text-white/60 border-white/20 hover:border-white/40')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <FileText size={36} className="text-white/20 mb-3" />
          <p className="text-white/60 font-medium">No invoices found</p>
          <Link to="/invoices/new" className="btn-primary mt-4"><Plus size={15} /> Create your first invoice</Link>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {filtered.map(inv => (
              <div key={inv.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400">{inv.invoice_number}</span>
                    <p className="font-medium text-white text-sm mt-0.5">{inv.customer_name}</p>
                    <p className="text-xs text-white/40">{fmtDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-white tabular-nums">{fmt(inv.total_amount)}</p>
                    {statusBadge(inv.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => downloadPDF(inv.id, inv.invoice_number)} className="btn-ghost p-2 flex-1 flex items-center justify-center gap-1 text-xs"><Download size={13} /> PDF</button>
                  <button onClick={() => printInvoice(inv.id, inv.invoice_number)} className="btn-ghost p-2 flex-1 flex items-center justify-center gap-1 text-xs"><Printer size={13} /> Print</button>
                  <button onClick={() => setPaymentInvoice(inv)} className="btn-ghost p-2 flex-1 flex items-center justify-center gap-1 text-xs"><CreditCard size={13} /> Pay</button>
                  {inv.status === 'UNPAID' && (
                    <button onClick={() => updateStatus(inv.id, 'PAID')} disabled={updatingId === inv.id}
                      className="text-xs px-3 py-2 bg-green-500/20 text-green-300 border border-green-400/30 rounded-lg font-medium flex-1">
                      {updatingId === inv.id ? '...' : 'Paid'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="table-wrapper hidden lg:block">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="th">Invoice #</th>
                  <th className="th">Customer</th>
                  <th className="th">GST Type</th>
                  <th className="th">Due Date</th>
                  <th className="th-right">Amount</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="tr-body">
                    <td className="td"><span className="font-mono text-xs font-semibold text-blue-400">{inv.invoice_number}</span></td>
                    <td className="td font-medium text-white">{inv.customer_name}{inv.customer_gstin && <p className="text-xs text-white/40 font-mono">{inv.customer_gstin}</p>}</td>
                    <td className="td"><span className={'text-xs px-2 py-0.5 rounded font-medium ' + (inv.supply_type === 'inter' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300')}>{inv.supply_type === 'inter' ? 'IGST' : 'CGST+SGST'}</span></td>
                    <td className="td text-white/50">{fmtDate(inv.due_date)}{new Date(inv.due_date) < new Date() && inv.status === 'UNPAID' && <span className="ml-2 text-xs text-red-400">(Overdue)</span>}</td>
                    <td className="td-right font-semibold text-white tabular-nums">{fmt(inv.total_amount)}</td>
                    <td className="td">{statusBadge(inv.status)}</td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => downloadPDF(inv.id, inv.invoice_number)} title="Download PDF" className="btn-ghost p-1.5 hover:text-blue-400"><Download size={13} /></button>
                        <button onClick={() => printInvoice(inv.id, inv.invoice_number)} title="Print" className="btn-ghost p-1.5 hover:text-green-400"><Printer size={13} /></button>
                        {inv.status !== 'CANCELLED' && <button onClick={() => setPaymentInvoice(inv)} className={'btn-ghost p-1.5 ' + (inv.status === 'PAID' ? 'text-green-400' : 'hover:text-cyan-400')}><CreditCard size={13} /></button>}
                        {inv.status === 'UNPAID' && <button onClick={() => updateStatus(inv.id, 'PAID')} disabled={updatingId === inv.id} className="text-xs px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 rounded-lg font-medium">{updatingId === inv.id ? '...' : 'Mark Paid'}</button>}
                        <div className="relative group">
                          <button className="btn-ghost p-1.5"><ChevronDown size={13} /></button>
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-10 hidden group-hover:block py-1">
                            {['UNPAID','PAID','OVERDUE','CANCELLED'].filter(s => s !== inv.status).map(s => (
                              <button key={s} onClick={() => updateStatus(inv.id, s)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">Mark {s}</button>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(inv.id, inv.invoice_number)} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => { setPaymentInvoice(null); load(); }}
          onPaid={(id) => updateStatus(id, 'PAID')}
        />
      )}
    </div>
  );
}