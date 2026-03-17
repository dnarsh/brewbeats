'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/use-store';

export interface NotePopupData {
  trackIndex: number;
  noteIndex: number;
  x: number;
  y: number;
}

interface NotePopupProps {
  data: NotePopupData | null;
  onClose: () => void;
}

// All standard notes for the searchable dropdown
const ALL_NOTES = (() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatNames: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  const notes: { value: string; label: string }[] = [];
  for (let oct = 1; oct <= 6; oct++) {
    for (const n of names) {
      const val = `${n}${oct}`;
      const flat = flatNames[n] ? ` / ${flatNames[n]}${oct}` : '';
      notes.push({ value: val, label: `${val}${flat}` });
    }
  }
  return notes;
})();

// Duration options with beginner-friendly labels
const DURATIONS = [
  { value: '1n', label: 'Whole (1n)', desc: '4 beats — very long' },
  { value: '2n.', label: 'Dotted Half (2n.)', desc: '3 beats' },
  { value: '2n', label: 'Half (2n)', desc: '2 beats — long' },
  { value: '4n.', label: 'Dotted Quarter (4n.)', desc: '1.5 beats' },
  { value: '4n', label: 'Quarter (4n)', desc: '1 beat — standard' },
  { value: '8n.', label: 'Dotted Eighth (8n.)', desc: '0.75 beats' },
  { value: '8n', label: 'Eighth (8n)', desc: '0.5 beats — quick' },
  { value: '16n', label: 'Sixteenth (16n)', desc: '0.25 beats — very quick' },
];

export function NotePopup({ data, onClose }: NotePopupProps) {
  const { composition, updateNote, removeNote } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);
  const [showDurDropdown, setShowDurDropdown] = useState(false);

  useEffect(() => {
    if (!data) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [data, onClose]);

  useEffect(() => {
    if (!data) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); e.stopPropagation(); } };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [data, onClose]);

  // Reset search when popup opens
  useEffect(() => { setNoteSearch(''); setShowNoteDropdown(false); setShowDurDropdown(false); }, [data]);

  if (!data || !composition) return null;
  const track = composition.tracks[data.trackIndex];
  if (!track?.notes?.[data.noteIndex]) return null;
  const note = track.notes[data.noteIndex];

  const filteredNotes = noteSearch
    ? ALL_NOTES.filter(n => n.label.toLowerCase().includes(noteSearch.toLowerCase()))
    : ALL_NOTES;

  const currentDur = DURATIONS.find(d => d.value === note.duration) || DURATIONS[4];

  return (
    <div
      ref={ref}
      className="fixed z-[400] bg-roast border border-roast-light rounded-xl shadow-2xl shadow-black/60 p-3 w-56"
      style={{
        left: Math.min(data.x, window.innerWidth - 240),
        top: Math.min(data.y + 10, window.innerHeight - 340),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider font-medium">Edit Note</span>
        <button onClick={onClose} className="text-warm-dim hover:text-cream text-xs">✕</button>
      </div>

      {/* Note pitch — searchable dropdown */}
      <div className="mb-2 relative">
        <label className="text-[9px] text-warm-dim uppercase tracking-wider block mb-1">Pitch</label>
        <input
          type="text"
          value={showNoteDropdown ? noteSearch : note.note}
          onFocus={() => { setShowNoteDropdown(true); setNoteSearch(''); }}
          onChange={e => setNoteSearch(e.target.value)}
          placeholder="Search notes... (C4, Eb3...)"
          className="w-full bg-espresso border border-roast-light rounded px-2 py-1.5 text-xs text-cream focus:outline-none focus:border-caramel/40 font-mono"
        />
        {showNoteDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-espresso border border-roast-light rounded-lg shadow-xl max-h-36 overflow-y-auto z-50">
            {filteredNotes.map(n => (
              <button
                key={n.value}
                onClick={() => { updateNote(data.trackIndex, data.noteIndex, { note: n.value }); setShowNoteDropdown(false); }}
                className={`w-full px-2 py-1 text-left text-[11px] hover:bg-caramel/10 transition-colors ${n.value === note.note ? 'text-caramel bg-caramel/5' : 'text-cream/80'}`}
              >
                <span className="font-mono">{n.value}</span>
                {n.label !== n.value && <span className="text-warm-dim/50 ml-1">{n.label.replace(n.value, '')}</span>}
              </button>
            ))}
            {filteredNotes.length === 0 && <p className="px-2 py-2 text-[10px] text-warm-dim/50">No matches</p>}
          </div>
        )}
      </div>

      {/* Velocity */}
      <div className="mb-2">
        <label className="text-[9px] text-warm-dim uppercase tracking-wider block mb-1">
          Volume: <span className="text-cream font-mono">{Math.round((note.velocity ?? 0.7) * 100)}%</span>
          <span className="text-warm-dim/40 ml-1">
            {(note.velocity ?? 0.7) < 0.3 ? '(whisper)' : (note.velocity ?? 0.7) < 0.6 ? '(soft)' : (note.velocity ?? 0.7) < 0.8 ? '(normal)' : '(loud)'}
          </span>
        </label>
        <input
          type="range" min="5" max="100" step="5"
          value={Math.round((note.velocity ?? 0.7) * 100)}
          onChange={e => updateNote(data.trackIndex, data.noteIndex, { velocity: parseInt(e.target.value) / 100 })}
          className="w-full h-1.5"
        />
      </div>

      {/* Duration — friendly dropdown */}
      <div className="mb-3 relative">
        <label className="text-[9px] text-warm-dim uppercase tracking-wider block mb-1">Duration</label>
        <button
          onClick={() => setShowDurDropdown(!showDurDropdown)}
          className="w-full bg-espresso border border-roast-light rounded px-2 py-1.5 text-xs text-cream text-left flex items-center justify-between focus:outline-none focus:border-caramel/40"
        >
          <span>{currentDur.label}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showDurDropdown ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showDurDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-espresso border border-roast-light rounded-lg shadow-xl overflow-hidden z-50">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { updateNote(data.trackIndex, data.noteIndex, { duration: d.value }); setShowDurDropdown(false); }}
                className={`w-full px-2 py-1.5 text-left hover:bg-caramel/10 transition-colors ${d.value === note.duration ? 'bg-caramel/5' : ''}`}
              >
                <span className={`text-[11px] font-medium ${d.value === note.duration ? 'text-caramel' : 'text-cream/80'}`}>{d.label}</span>
                <span className="text-[9px] text-warm-dim/50 block">{d.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => { removeNote(data.trackIndex, data.noteIndex); onClose(); }}
        className="w-full py-1.5 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-colors border border-red-900/20"
      >
        Delete Note
      </button>
    </div>
  );
}
