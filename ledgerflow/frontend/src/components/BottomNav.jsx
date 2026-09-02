import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, Receipt } from 'lucide-react';

const links = [
  { to: '/',          label: 'Home',      icon: LayoutDashboard },
  { to: '/invoices',  label: 'Invoices',  icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products',  label: 'Products',  icon: Package },
  { to: '/expenses',  label: 'Expenses',  icon: Receipt },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1 ${
                isActive ? 'text-blue-400' : 'text-white/40'
              }`
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
      </div>
    </nav>
  );
}
