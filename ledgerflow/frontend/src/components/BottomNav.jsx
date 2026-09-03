import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, Receipt, Building2, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const mainLinks = [
  { to: '/',          label: 'Home',      icon: LayoutDashboard },
  { to: '/invoices',  label: 'Invoices',  icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products',  label: 'Products',  icon: Package },
];

const moreLinks = [
  { to: '/expenses',   label: 'Expenses',   icon: Receipt },
  { to: '/businesses', label: 'Businesses', icon: Building2 },
];

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around px-1 py-2">
          {mainLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1 ' +
                (isActive ? 'text-blue-400' : 'text-white/40')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'text-blue-400' : 'text-white/40'} />
                  <span className="text-[10px] font-medium truncate">{label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 text-white/40 hover:text-white/80 transition-all"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0d1117] border-t border-white/10 rounded-t-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">More Options</p>
              <button onClick={() => setShowMore(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {moreLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ' +
                    (isActive
                      ? 'bg-blue-600/20 border-blue-400/30 text-blue-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10')
                  }
                >
                  <Icon size={24} />
                  <span className="text-xs font-medium">{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => { logout(); navigate('/login'); setShowMore(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}