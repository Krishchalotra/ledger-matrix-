import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText,
  Receipt, LogOut, Menu, X, Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';

const links = [
  { to: '/',            label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/invoices',    label: 'Invoices',   icon: FileText },
  { to: '/customers',   label: 'Customers',  icon: Users },
  { to: '/products',    label: 'Products',   icon: Package },
  { to: '/expenses',    label: 'Expenses',   icon: Receipt },
  { to: '/businesses',  label: 'Businesses', icon: Building2 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navContent = (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center px-4 h-14 border-b border-white/10 flex-shrink-0">
        <img src={logo} alt="Ledger Matrix" className="h-8 w-auto" />
      </div>

      {/* Nav section */}
      <nav className="flex-1 px-3 pt-5 space-y-0.5">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100 group ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'} />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10 my-2" />

      {/* User footer */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-white/40 truncate capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-white/40
                     hover:bg-red-500/10 hover:text-red-400 transition-colors duration-100"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-gray-900 rounded-md border border-white/10 shadow"
      >
        <Menu size={17} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-[#0d1117] border-r border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/40 hover:text-white">
              <X size={17} />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#0d1117] border-r border-white/10 flex-shrink-0">
        {navContent}
      </aside>
    </>
  );
}
