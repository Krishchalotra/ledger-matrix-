import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Mail, Smartphone, ExternalLink, Copy, Check, Loader } from 'lucide-react';
import api from '../api/axios';

export default function PaymentModal({ invoice, onClose, onPaid }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState(null);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    if (invoice.razorpay_payment_link_url) {
      loadShareData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadShareData = async () => {
    setLoading(true);
    try {
      const [shareRes, qrRes] = await Promise.all([
        api.get(`/payments/invoice/${invoice.id}/share`),
        api.get(`/payments/invoice/${invoice.id}/qr`),
      ]);
      setData(shareRes.data);
      setQr(qrRes.data.qr);
    } catch (err) {
      setError('Failed to load payment details.');
    } finally { setLoading(false); }
  };

  const generateLink = async () => {
    setGenerating(true); setError('');
    try {
      await api.post(`/payments/invoice/${invoice.id}/payment-link`);
      await loadShareData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payment link.');
    } finally { setGenerating(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.payment_url || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box w-full max-w-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="text-sm font-semibold text-white">Payment — {invoice.invoice_number}</h2>
            <p className="text-xs text-white/40 mt-0.5">{invoice.customer_name} · {fmt(invoice.total_amount)}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={17} /></button>
        </div>

        <div className="p-6">

          {/* Status badge */}
          <div className="flex items-center justify-between mb-5">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              invoice.status === 'PAID'
                ? 'bg-green-500/20 text-green-300 border-green-400/30'
                : invoice.status === 'OVERDUE'
                ? 'bg-red-500/20 text-red-300 border-red-400/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}>
              {invoice.status}
            </span>
            {invoice.status === 'UNPAID' && (
              <button onClick={() => { onPaid(invoice.id); onClose(); }}
                className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 rounded-lg font-medium transition-colors">
                Mark as Paid manually
              </button>
            )}
          </div>

          {error && <div className="alert-danger mb-4"><span>{error}</span></div>}

          {loading ? (
            <div className="flex justify-center py-10"><Loader size={20} className="animate-spin text-white/40" /></div>
          ) : !invoice.razorpay_payment_link_url ? (
            /* No payment link yet */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={28} className="text-blue-300" />
              </div>
              <p className="text-white font-semibold mb-1">Generate Payment Link</p>
              <p className="text-white/40 text-sm mb-5">Create a payment link to share with your customer via WhatsApp, SMS or email.</p>
              <p className="text-xs text-amber-400 mb-5">⚠ Requires Razorpay API keys in .env</p>
              <button onClick={generateLink} disabled={generating} className="btn-primary mx-auto">
                {generating ? <><Loader size={14} className="animate-spin" /> Generating...</> : 'Generate Payment Link'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* QR Code */}
              {qr && (
                <div className="flex flex-col items-center">
                  <p className="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">Scan to Pay</p>
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <img src={qr} alt="Payment QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-white/30 mt-2">Customer scans this with any UPI app</p>
                </div>
              )}

              {/* Copy link */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-xs text-white/50 flex-1 truncate">{data?.payment_url}</span>
                <button onClick={copyLink} className="text-white/40 hover:text-white flex-shrink-0">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <a href={data?.payment_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-cyan-400 flex-shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>

              {/* Share buttons */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">Share with Customer</p>
                <div className="grid grid-cols-3 gap-3">
                  <a href={data?.whatsapp_url} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-green-500/10 border border-green-400/20 hover:bg-green-500/20 transition-colors">
                    <MessageCircle size={20} className="text-green-400" />
                    <span className="text-xs text-green-300 font-medium">WhatsApp</span>
                  </a>
                  <a href={data?.sms_url}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/20 transition-colors">
                    <Smartphone size={20} className="text-blue-400" />
                    <span className="text-xs text-blue-300 font-medium">SMS</span>
                  </a>
                  <a href={data?.mail_url}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-purple-500/10 border border-purple-400/20 hover:bg-purple-500/20 transition-colors">
                    <Mail size={20} className="text-purple-400" />
                    <span className="text-xs text-purple-300 font-medium">Email</span>
                  </a>
                </div>
              </div>

              {/* Message preview */}
              {data?.message && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/40 mb-1 font-semibold">Message Preview</p>
                  <p className="text-xs text-white/60 leading-relaxed">{data.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
