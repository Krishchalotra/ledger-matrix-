import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function Select({ options = [], value, onChange, placeholder = 'Select...', searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropH = 220;
      setPos({
        left: rect.left,
        width: rect.width,
        top: spaceBelow > dropH ? rect.bottom + 4 : rect.top - dropH - 4,
      });
    }
    setSearch('');
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        // check if click is inside portal dropdown
        const portal = document.getElementById('select-portal');
        if (portal && portal.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  const dropdown = open ? (
    <div
      id="select-portal"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
      className="bg-[#1e2538] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
    >
      {searchable && (
        <div className="p-2 border-b border-white/10 bg-[#1e2538]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight: searchable ? '168px' : '200px' }}>
        {filtered.length === 0 ? (
          <p className="text-white/30 text-xs px-3 py-3 text-center">
            {options.length === 0 ? 'No items available' : 'No results found'}
          </p>
        ) : (
          filtered.map(o => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => handleSelect(o.value)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors
                ${String(o.value) === String(value)
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="truncate">{o.label}</span>
              {String(o.value) === String(value) && <Check size={13} className="text-blue-400 flex-shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm
          bg-white/10 border transition-all duration-150
          ${open ? 'border-blue-400/50 ring-2 ring-blue-500/30' : 'border-white/20 hover:border-white/40'}`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-white/30'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-white/40 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
}
