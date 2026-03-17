'use client';

import { useStore } from '@/store/use-store';
import { SNAP_OPTIONS } from '@/lib/editor-constants';

export function EditorToolbar() {
  const {
    editorTool, setEditorTool, editorSnap, setEditorSnap,
    selectedTrackIndex, duplicateTrack, deleteTrack, clearTrack,
    addMeasure, removeMeasure, closeEditor, composition,
    undo, redo, undoStack, redoStack,
    advisorOpen, toggleAdvisor,
  } = useStore();

  return (
    <div className="bg-roast border-b border-roast-light px-4 py-2 flex items-center gap-3 z-10 flex-none">
      {/* Tool modes */}
      <div className="flex items-center gap-1">
        {(['pencil', 'eraser', 'select'] as const).map((tool, i) => (
          <button
            key={tool}
            onClick={() => setEditorTool(tool)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs font-medium ${
              editorTool === tool
                ? 'bg-caramel/20 text-caramel border border-caramel/30'
                : 'bg-roast-light text-warm-dim hover:text-cream'
            }`}
            title={`${tool.charAt(0).toUpperCase() + tool.slice(1)} (${i + 1})`}
          >
            {tool === 'pencil' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            )}
            {tool === 'eraser' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16l9-9 8 8-4 5z"/><path d="M6 11l8 8"/></svg>
            )}
            {tool === 'select' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
            )}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-roast-light" />

      {/* Snap grid */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider">Snap</span>
        {SNAP_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setEditorSnap(opt.value)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              editorSnap === opt.value
                ? 'bg-caramel/20 text-caramel'
                : 'bg-roast-light text-warm-dim hover:text-cream'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-roast-light" />

      {/* Track actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => selectedTrackIndex !== null && duplicateTrack(selectedTrackIndex)}
          disabled={selectedTrackIndex === null}
          className="px-2 py-1 rounded text-[10px] bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 transition-colors"
          title="Duplicate Track"
        >
          Dup
        </button>
        <button
          onClick={() => selectedTrackIndex !== null && clearTrack(selectedTrackIndex)}
          disabled={selectedTrackIndex === null}
          className="px-2 py-1 rounded text-[10px] bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 transition-colors"
          title="Clear Track Notes"
        >
          Clear
        </button>
        <button
          onClick={() => selectedTrackIndex !== null && deleteTrack(selectedTrackIndex)}
          disabled={selectedTrackIndex === null || (composition?.tracks.length ?? 0) <= 1}
          className="px-2 py-1 rounded text-[10px] bg-roast-light text-warm-dim hover:text-red-400 disabled:opacity-30 transition-colors"
          title="Delete Track"
        >
          Del
        </button>
      </div>

      <div className="w-px h-6 bg-roast-light" />

      {/* Measures */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider">Bars</span>
        <button
          onClick={removeMeasure}
          disabled={!composition || composition.measures <= 1}
          className="w-6 h-6 rounded bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center text-xs"
        >
          -
        </button>
        <span className="text-xs text-cream w-5 text-center font-mono">{composition?.measures ?? 0}</span>
        <button
          onClick={addMeasure}
          disabled={!composition}
          className="w-6 h-6 rounded bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center text-xs"
        >
          +
        </button>
      </div>

      <div className="w-px h-6 bg-roast-light" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button onClick={undo} disabled={undoStack.length === 0} className="w-7 h-7 rounded-lg bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center transition-colors" title="Undo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        </button>
        <button onClick={redo} disabled={redoStack.length === 0} className="w-7 h-7 rounded-lg bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center transition-colors" title="Redo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Advisor toggle */}
      <button
        onClick={toggleAdvisor}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${advisorOpen ? 'bg-caramel/20 text-caramel border border-caramel/30' : 'bg-roast-light text-warm-dim hover:text-cream'}`}
        title="AI Advisor"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
      </button>

      {/* Close */}
      <button
        onClick={closeEditor}
        className="w-8 h-8 rounded-lg bg-roast-light text-warm-dim hover:text-cream hover:bg-red-900/30 flex items-center justify-center transition-colors"
        title="Close Editor (Esc)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
