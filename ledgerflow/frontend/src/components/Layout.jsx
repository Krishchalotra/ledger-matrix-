import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import cityBg from '../assets/city-bg.jpg';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* City background */}
      <div className="absolute inset-0 z-0">
        <img src={cityBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Desktop sidebar */}
      <div className="relative z-10 flex-shrink-0 hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
