import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, FileText, BarChart2, Shield, Receipt, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import cityBg from '../assets/city-bg.jpg';
import logo from '../assets/logo.svg';

const features = [
  { icon: FileText,  title: 'Invoices & Billing',    desc: 'Create and track invoices effortlessly' },
  { icon: Receipt,   title: 'Expense Tracking',      desc: 'Track and organize your expenses' },
  { icon: BarChart2, title: 'Real-time Reports',     desc: 'Get insights and grow your business' },
  { icon: Shield,    title: 'Secure & Reliable',     desc: 'Your data is safe with us' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">

      {/* City background */}
      <div className="absolute inset-0">
        <img src={cityBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 flex flex-col lg:flex-row items-center gap-16 py-10">

        {/* Left — branding */}
        <div className="flex-1 max-w-lg">
          {/* Logo */}
          <div className="mb-10">
            <img src={logo} alt="Ledger Matrix" className="h-14 w-auto" />
          </div>

          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
            Smart accounting<br />
            for growing{' '}
            <span className="text-cyan-400">businesses.</span>
          </h1>
          <p className="text-white/60 text-sm mb-10 leading-relaxed">
            Manage invoices, expenses, accounts and more —<br />all in one place.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/30 text-xs mt-12">© 2026 Ledger Matrix. All rights reserved.</p>
        </div>

        {/* Right — glassmorphism card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">

            {/* Card header */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-14 h-14 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center mb-4">
                <img src={logo} alt="" className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-white/50 mt-1">Sign in to your Ledger Matrix account</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                <input type="email"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                  placeholder="Enter your email"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                    placeholder="Enter your password"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {loading
                  ? <><Loader size={15} className="animate-spin" /> Signing in...</>
                  : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-white/40 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
