'use client';

import { useState } from 'react';
import { useStore } from '@/store/use-store';
import { INSTRUMENT_CATEGORIES } from '@/lib/editor-constants';
import { getInstrumentColor } from '@/types/composition';
import { getInstrumentConfig } from '@/lib/audio/instrument-registry';

export function InstrumentBrowser() {
  const addTrack = useStore(s => s.addTrack);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const undoStack = useStore(s => s.undoStack);
  const redoStack = useStore(s => s.redoStack);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Keys', 'Bass', 'Drums']));
  const [customInstrument, setCustomInstrument] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleCustomAdd = () => {
    const name = customInstrument.trim().toLowerCase().replace(/\s+/g, '_');
    if (name) { addTrack(name); setCustomInstrument(''); }
  };

  const filteredCategories = Object.entries(INSTRUMENT_CATEGORIES).map(([cat, instruments]) => ({
    cat,
    instruments: search ? instruments.filter(i => i.toLowerCase().includes(search.toLowerCase())) : instruments,
  })).filter(c => c.instruments.length > 0);

  if (collapsed) {
    return (
      <div className="w-10 bg-roast border-r border-roast-light flex flex-col items-center py-3 flex-none">
        <button onClick={() => setCollapsed(false)} className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream flex items-center justify-center transition-colors" title="Expand Browser">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-roast border-r border-roast-light flex flex-col flex-none overflow-hidden">
      {/* Header + Undo/Redo */}
      <div className="px-3 py-2 border-b border-roast-light flex items-center justify-between">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider font-medium">Instruments</span>
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={undoStack.length === 0} className="w-5 h-5 rounded text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center" title="Undo (Ctrl+Z)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="w-5 h-5 rounded text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center" title="Redo (Ctrl+Shift+Z)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
          </button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${showGuide ? 'text-caramel' : 'text-warm-dim hover:text-cream'}`} title="Help Guide">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>
          </button>
          <button onClick={() => setCollapsed(true)} className="w-5 h-5 rounded text-warm-dim hover:text-cream flex items-center justify-center" title="Collapse">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      </div>

      {/* Quick Guide */}
      {showGuide && (
        <div className="px-3 py-2 bg-espresso border-b border-roast-light text-[10px] text-warm-dim leading-relaxed max-h-[50vh] overflow-y-auto">
          <p className="text-cream font-medium mb-1.5">Editor Guide</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Tools</p>
          <p><span className="text-caramel">Pencil (1)</span> — Click grid to add notes, click note to edit pitch/volume/duration</p>
          <p><span className="text-caramel">Eraser (2)</span> — Click notes to delete them</p>
          <p><span className="text-caramel">Select (3)</span> — Drag to select multiple, Delete key to remove</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Grid Controls</p>
          <p><span className="text-caramel">Snap</span> — 1/4 = quarter note, 1/8 = eighth, 1/16 = sixteenth (finest)</p>
          <p><span className="text-caramel">+/- Bars</span> — Add or remove measures to your composition</p>
          <p><span className="text-caramel">Click instrument</span> — Expand track to see each note on its own row</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Track Management</p>
          <p><span className="text-caramel">Dup</span> — Duplicate the selected track with all notes</p>
          <p><span className="text-caramel">Clear</span> — Remove all notes but keep the instrument</p>
          <p><span className="text-caramel">Del</span> — Remove the entire track</p>
          <p><span className="text-caramel">Custom instrument</span> — Type any name below to add it (auto-synthesized)</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Note Editing</p>
          <p>Click a note to open the editor popup where you can:</p>
          <p>• Search and change the <span className="text-caramel">pitch</span> (e.g., C4, Eb3)</p>
          <p>• Adjust <span className="text-caramel">volume</span> (0-100%) with human labels</p>
          <p>• Change <span className="text-caramel">duration</span> (whole, half, quarter, eighth, sixteenth)</p>
          <p>• <span className="text-red-400">Delete</span> the note</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">AI Advisor (✨ button)</p>
          <p>Open the AI panel on the right to get professional music advice:</p>
          <p>• Click <span className="text-caramel">quick question buttons</span> at the top or type your own</p>
          <p>• AI suggests changes as <span className="text-caramel">ghost notes</span> (semi-transparent, dashed)</p>
          <p>• <span className="text-green-400">Accept</span> or <span className="text-red-400">Reject</span> per-note or per-group</p>
          <p>• <span className="text-caramel">◈ AI View</span> — shows only ghost notes, hides real notes</p>
          <p>• <span className="text-caramel">⊘ Lock</span> rejected note — AI won&apos;t suggest it again</p>
          <p>• Regular rejections are temporary — AI may re-suggest them</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Ghost Notes</p>
          <p>• <span className="text-caramel">Dashed notes</span> = AI suggestions (not committed yet)</p>
          <p>• <span className="text-red-400">Red ghost notes</span> = AI suggests deleting this note</p>
          <p>• Ghost notes are <span className="text-caramel">audible</span> when you play — preview before committing</p>
          <p>• In <span className="text-caramel">AI View</span> mode, ONLY ghost notes play</p>
          <p>• Ghost notes are fully <span className="text-caramel">editable</span> — change pitch, volume, duration</p>

          <p className="text-cream/80 font-medium mt-2 mb-0.5">Keyboard Shortcuts</p>
          <p><span className="text-caramel">1/2/3</span> — Pencil / Eraser / Select</p>
          <p><span className="text-caramel">Ctrl+Z</span> — Undo | <span className="text-caramel">Ctrl+Shift+Z</span> — Redo</p>
          <p><span className="text-caramel">Esc</span> — Close editor</p>

          <p className="mt-2 text-warm-dim/40 text-[9px]">Close editor to play your music from the main app. All edits are saved automatically.</p>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-roast-light">
        <input
          type="text" placeholder="Search instruments..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-espresso border border-roast-light rounded px-2 py-1 text-xs text-cream placeholder:text-warm-dim/50 focus:outline-none focus:border-caramel/40"
        />
      </div>

      {/* Custom Instrument */}
      <div className="px-3 py-2 border-b border-roast-light">
        <label className="text-[9px] text-warm-dim uppercase tracking-wider block mb-1">Custom Instrument</label>
        <div className="flex gap-1">
          <input
            type="text" placeholder="e.g. glass_harp" value={customInstrument}
            onChange={e => setCustomInstrument(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCustomAdd(); }}
            className="flex-1 bg-espresso border border-roast-light rounded px-2 py-1 text-xs text-cream placeholder:text-warm-dim/40 focus:outline-none focus:border-caramel/40 font-mono"
          />
          <button onClick={handleCustomAdd} disabled={!customInstrument.trim()} className="px-2 py-1 rounded bg-caramel/20 text-caramel text-[10px] font-medium hover:bg-caramel/30 disabled:opacity-30 transition-colors">
            Add
          </button>
        </div>
        <p className="text-[8px] text-warm-dim/40 mt-1">Type any instrument name — it auto-synthesizes</p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map(({ cat, instruments }) => (
          <div key={cat}>
            <button onClick={() => toggleCategory(cat)} className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-warm-dim hover:text-cream hover:bg-roast-light/50 transition-colors">
              <span>{cat}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${openCategories.has(cat) ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {openCategories.has(cat) && (
              <div className="pb-1">
                {instruments.map(inst => {
                  const config = getInstrumentConfig(inst);
                  const color = getInstrumentColor(inst);
                  return (
                    <button key={inst} onClick={() => addTrack(inst)} className="w-full px-4 py-1 flex items-center gap-2 text-[11px] text-cream/80 hover:bg-caramel/10 hover:text-cream transition-colors" title={`Add ${config.name} track`}>
                      <div className="w-3 h-3 rounded-sm flex-none" style={{ backgroundColor: color }} />
                      <span className="truncate">{config.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
