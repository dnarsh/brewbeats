'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '@/store/use-store';
import { LOCAL_MODELS, RECOMMENDED_MODELS, ModelConfig } from '@/lib/models';

function ModelDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const currentModel = LOCAL_MODELS.find(m => m.id === value);

  // Filter and sort A-Z
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const models = q
      ? LOCAL_MODELS.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      : LOCAL_MODELS;

    // Group: recommended first, then rest sorted A-Z by name
    const recommended = models
      .filter(m => RECOMMENDED_MODELS.includes(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    const rest = models
      .filter(m => !RECOMMENDED_MODELS.includes(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { recommended, rest };
  }, [search]);

  const tierBadge = (m: ModelConfig) => {
    if (m.tier === 'fast') return 'bg-green-900/40 text-green-400';
    if (m.tier === 'balanced') return 'bg-caramel/15 text-caramel';
    return 'bg-dusk/20 text-dusk-light';
  };

  const typeIcon = (type: string) => {
    if (type === 'reasoning') return '🧠';
    if (type === 'code') return '💻';
    return '💬';
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const renderModel = (m: ModelConfig) => (
    <button
      key={m.id}
      onClick={() => handleSelect(m.id)}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-roast-light/60 transition-colors ${
        m.id === value ? 'bg-caramel/10' : ''
      }`}
    >
      <span className="text-xs flex-none">{typeIcon(m.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-cream truncate">{m.name}</span>
          {m.id === value && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-caramel flex-none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className="text-[10px] text-warm-dim/50 truncate block">{m.id}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tierBadge(m)}`}>
          {m.speed} t/s
        </span>
      </div>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected model button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-espresso border border-roast-light rounded-lg px-3 py-2.5 text-left flex items-center gap-2 hover:border-caramel/30 transition-colors"
      >
        <span className="text-xs flex-none">{typeIcon(currentModel?.type || 'chat')}</span>
        <span className="text-sm text-cream flex-1 truncate">
          {currentModel?.name || value}
        </span>
        {currentModel && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-none ${tierBadge(currentModel)}`}>
            {currentModel.speed} t/s
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-warm-dim transition-transform flex-none ${open ? 'rotate-180' : ''}`}>
          <polygon points="0,3 10,3 5,8" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-roast border border-roast-light rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-roast-light/50">
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-dim/50">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search local engines..."
                className="w-full bg-espresso border border-roast-light/50 rounded-lg pl-8 pr-3 py-2 text-sm text-cream placeholder:text-warm-dim/40 outline-none focus:border-caramel/30 transition-colors"
              />
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-[320px] overflow-y-auto">
            {filtered.recommended.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-caramel uppercase tracking-wider font-semibold bg-roast-light/30 sticky top-0 z-10">
                  Recommended for Music
                </div>
                {filtered.recommended.map(renderModel)}
              </>
            )}

            {filtered.rest.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-warm-dim uppercase tracking-wider font-semibold bg-roast-light/30 sticky top-0 z-10">
                  All Engines (A-Z)
                </div>
                {filtered.rest.map(renderModel)}
              </>
            )}

            {filtered.recommended.length === 0 && filtered.rest.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-warm-dim">
                No engines match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>

          {/* Count */}
          <div className="px-3 py-1.5 border-t border-roast-light/50 text-[10px] text-warm-dim/50 text-center">
            {LOCAL_MODELS.length} engines available
          </div>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { showSettings, toggleSettings, model, setModel } = useStore();

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={toggleSettings}>
      <div
        className="bg-roast rounded-xl border border-roast-light w-[480px] max-w-[90vw] max-h-[80vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-roast-light flex items-center justify-between flex-none">
          <h2 className="text-sm font-semibold text-cream">Settings</h2>
          <button onClick={toggleSettings} className="text-warm-dim hover:text-cream transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs text-warm-dim mb-1.5">AI Model</label>
            <ModelDropdown value={model} onChange={setModel} />
            <p className="text-[10px] text-warm-dim/60 mt-1.5">
              🧠 reasoning &middot; 💻 code &middot; 💬 chat &middot; Speed in tokens/sec
            </p>
          </div>

          <div className="pt-2 border-t border-roast-light">
            <h3 className="text-xs text-warm-dim mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="text-warm-dim">Play/Pause</span>
              <span className="text-cream font-mono">Space</span>
              <span className="text-warm-dim">Stop</span>
              <span className="text-cream font-mono">Escape</span>
              <span className="text-warm-dim">Undo</span>
              <span className="text-cream font-mono">Ctrl+Z</span>
              <span className="text-warm-dim">Redo</span>
              <span className="text-cream font-mono">Ctrl+Shift+Z</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
