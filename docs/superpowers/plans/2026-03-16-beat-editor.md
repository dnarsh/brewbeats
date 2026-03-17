# Beat Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fullscreen manual beat editor overlay with instrument browser, enhanced piano roll, editing tools, and note properties popup — integrated into the existing BrewBeats app.

**Architecture:** Fullscreen overlay rendered conditionally via `editorOpen` state in Zustand. Five new React components (BeatEditor, EditorToolbar, InstrumentBrowser, EditorGrid, NotePopup) compose inside the overlay. All editing actions modify the existing composition in the store. The audio engine is only reloaded on track-level changes or when the user plays/closes the editor.

**Tech Stack:** React 18, TypeScript, Zustand, Tone.js, Tailwind CSS (existing app stack)

**Spec:** `docs/superpowers/specs/2026-03-16-beat-editor-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/BeatEditor.tsx` | Fullscreen overlay shell, layout (left/center/bottom), keyboard shortcuts, mounts sub-components |
| `src/components/EditorToolbar.tsx` | Top bar: tool modes (pencil/eraser/select), snap grid, track actions (+/- bar), close button |
| `src/components/InstrumentBrowser.tsx` | Left sidebar: search, categorized instrument list, click-to-add-track |
| `src/components/EditorGrid.tsx` | Enhanced piano roll with click-to-place, resize, select, drag, drum sub-rows |
| `src/components/NotePopup.tsx` | Popup for editing note pitch, velocity, duration, delete |
| `src/lib/editor-constants.ts` | Instrument categories, default notes map, editor constants |

### Modified Files
| File | Changes |
|------|---------|
| `src/store/use-store.ts` | Add editor state + new actions (addTrack, deleteTrack, duplicateTrack, clearTrack, updateNote, moveNote, resizeNote, addDrumHit, removeDrumHit, batch actions, editor UI state) |
| `src/components/Transport.tsx` | Add Edit button (pencil icon) next to undo/redo |
| `src/components/KeyboardShortcuts.tsx` | Skip handler when `editorOpen` is true |
| `src/app/page.tsx` | Render `<BeatEditor />` when `editorOpen` is true |

### NOT Modified
| File | Reason |
|------|--------|
| `src/components/Timeline.tsx` | Editor has its own grid component |
| `src/components/Mixer.tsx` | Unchanged — still works via store |
| `src/lib/audio/engine.ts` | No changes — store actions handle reload timing |

---

## Chunk 1: Store Foundation + Editor Shell

### Task 1: Editor Constants File

**Files:**
- Create: `src/lib/editor-constants.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// Instrument categories for the browser
export const INSTRUMENT_CATEGORIES: Record<string, string[]> = {
  'Keys': ['piano', 'electric_piano', 'organ', 'harpsichord', 'celesta', 'clavinet', 'melodica'],
  'Bass': ['bass', 'sub_bass', 'synth_bass', '808_bass', 'upright_bass', 'fretless_bass'],
  'Drums': ['drums'],
  'Strings': ['violin', 'viola', 'cello', 'double_bass', 'strings', 'harp'],
  'Brass': ['trumpet', 'trombone', 'french_horn', 'tuba', 'flugelhorn', 'cornet'],
  'Woodwind': ['flute', 'clarinet', 'oboe', 'sax', 'bassoon', 'recorder', 'pan_flute'],
  'Synth / Lead': ['synth', 'saw_lead', 'square_lead', 'arp_synth', 'acid_lead', 'retro_synth'],
  'Pads': ['warm_pad', 'string_pad', 'shimmer_pad', 'celestial_pad', 'ambient_texture'],
  'Percussion': ['marimba', 'xylophone', 'vibraphone', 'kalimba', 'steel_drums', 'glockenspiel'],
  'World': ['sitar', 'koto', 'djembe', 'tabla', 'shakuhachi', 'erhu', 'bagpipes'],
  'Guitar': ['guitar', 'banjo', 'ukulele', 'mandolin', 'lute'],
};

// Default note for any instrument — category-based fallback
export function getDefaultNote(instrument: string): string {
  const KNOWN: Record<string, string> = {
    piano:'C4', guitar:'E3', bass:'C2', synth:'C4', organ:'C4', strings:'G4',
    trumpet:'C4', flute:'C5', marimba:'C4', pluck:'E4', vocals:'C4',
    sax:'Bb3', violin:'A4', cello:'C3', harp:'C4', clarinet:'Bb4',
    trombone:'Bb3', french_horn:'F3', tuba:'Bb1', oboe:'C5', harmonica:'C4',
    banjo:'G3', ukulele:'A4', sitar:'C4', steel_drums:'C5', xylophone:'C5',
    vibraphone:'C4', accordion:'C4', electric_piano:'C4', kalimba:'C5', celesta:'C5',
  };
  if (KNOWN[instrument]) return KNOWN[instrument];
  const name = instrument.toLowerCase();
  if (/bass|sub|808|tuba|contrabass/.test(name)) return 'C2';
  if (/pad|ambient|drone|texture/.test(name)) return 'C3';
  if (/lead|synth|arp|acid|saw|square/.test(name)) return 'C4';
  if (/flute|piccolo|whistle|recorder/.test(name)) return 'C5';
  if (/violin|fiddle/.test(name)) return 'G4';
  if (/cello|viola/.test(name)) return 'C3';
  if (/guitar|banjo|ukulele|mandolin/.test(name)) return 'E3';
  if (/brass|trumpet|horn|trombone/.test(name)) return 'C4';
  return 'C4';
}

// Drum types for the drum sub-rows
export const DRUM_TYPES = ['kick', 'snare', 'hihat', 'tom', 'cymbal'] as const;

// Snap options
export const SNAP_OPTIONS = [
  { value: '4n' as const, label: '1/4' },
  { value: '8n' as const, label: '1/8' },
  { value: '16n' as const, label: '1/16' },
];

// Subdivisions per snap value
export const SNAP_SUBDIVISIONS: Record<string, number> = { '4n': 4, '8n': 2, '16n': 1 };
```

- [ ] **Step 2: Verify build**

Run: `npx next build` — should pass with no errors.

### Task 2: Store Additions — Editor State + Actions

**Files:**
- Modify: `src/store/use-store.ts`

- [ ] **Step 1: Add editor state to the store interface**

Add these fields to the store state interface:

```typescript
// Editor state
editorOpen: boolean;
selectedTrackIndex: number | null;
editorTool: 'pencil' | 'eraser' | 'select';
editorSnap: '4n' | '8n' | '16n';
```

And these actions:

```typescript
// Editor UI
openEditor: () => void;
closeEditor: () => void;
setSelectedTrack: (index: number | null) => void;
setEditorTool: (tool: 'pencil' | 'eraser' | 'select') => void;
setEditorSnap: (snap: '4n' | '8n' | '16n') => void;

// Track management
addTrack: (instrument: string) => void;
deleteTrack: (trackIndex: number) => void;
duplicateTrack: (trackIndex: number) => void;
clearTrack: (trackIndex: number) => void;

// Note editing (new or updated)
updateNote: (trackIndex: number, noteIndex: number, updates: Partial<Note>) => void;
moveNote: (trackIndex: number, noteIndex: number, newTime: string) => void;
resizeNote: (trackIndex: number, noteIndex: number, newDuration: string) => void;

// Drum editing
addDrumHit: (trackIndex: number, hit: DrumHit) => void;
removeDrumHit: (trackIndex: number, hitIndex: number) => void;

// Batch operations
removeNotes: (removals: { trackIndex: number; noteIndex: number }[]) => void;
moveNotes: (moves: { trackIndex: number; noteIndex: number; newTime: string }[]) => void;

// Composition length
addMeasure: () => void;
removeMeasure: () => void;
```

- [ ] **Step 2: Add default state values**

In the store creation, add defaults:

```typescript
editorOpen: false,
selectedTrackIndex: null,
editorTool: 'pencil' as const,
editorSnap: '16n' as const,
```

- [ ] **Step 3: Implement editor UI actions**

```typescript
openEditor: () => set({ editorOpen: true }),
closeEditor: () => {
  set({ editorOpen: false, selectedTrackIndex: null, editorTool: 'pencil' });
  // Reload engine to pick up all note edits made during editing session
  const comp = get().composition;
  if (comp) { try { getEngine().loadComposition(comp); } catch {} }
},
setSelectedTrack: (index) => set({ selectedTrackIndex: index }),
setEditorTool: (tool) => set({ editorTool: tool }),
setEditorSnap: (snap) => set({ editorSnap: snap }),
```

- [ ] **Step 4: Implement track management actions**

```typescript
addTrack: (instrument: string) => {
  const comp = get().composition;
  if (!comp) return;
  const newTrack: Track = {
    instrument,
    volume: 0.7,
    muted: false,
    solo: false,
    notes: instrument === 'drums' ? undefined : [],
    pattern: instrument === 'drums' ? [] : undefined,
    effects: { reverb: 0, delay: 0 },
  };
  const newComp = { ...comp, tracks: [...comp.tracks, newTrack] };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [], revealedTracks: allTrackIndices(newComp.tracks) });
  try { getEngine().loadComposition(newComp); } catch {}
},

deleteTrack: (trackIndex: number) => {
  const comp = get().composition;
  if (!comp || comp.tracks.length <= 1) return;
  const newComp = { ...comp, tracks: comp.tracks.filter((_, i) => i !== trackIndex) };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [], revealedTracks: allTrackIndices(newComp.tracks), selectedTrackIndex: null });
  try { getEngine().loadComposition(newComp); } catch {}
},

duplicateTrack: (trackIndex: number) => {
  const comp = get().composition;
  if (!comp) return;
  const track = comp.tracks[trackIndex];
  const clone = JSON.parse(JSON.stringify(track));
  const newComp = { ...comp, tracks: [...comp.tracks, clone] };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [], revealedTracks: allTrackIndices(newComp.tracks) });
  try { getEngine().loadComposition(newComp); } catch {}
},

clearTrack: (trackIndex: number) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    notes: track.instrument === 'drums' ? undefined : [],
    pattern: track.instrument === 'drums' ? [] : undefined,
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},
```

- [ ] **Step 5: Implement note editing actions**

```typescript
updateNote: (trackIndex, noteIndex, updates) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, ...updates } : n),
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

moveNote: (trackIndex, noteIndex, newTime) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, time: newTime } : n),
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

resizeNote: (trackIndex, noteIndex, newDuration) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, duration: newDuration } : n),
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

addDrumHit: (trackIndex, hit) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    pattern: [...(track.pattern || []), hit],
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

removeDrumHit: (trackIndex, hitIndex) => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
    ...track,
    pattern: track.pattern?.filter((_, i) => i !== hitIndex),
  }));
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

removeNotes: (removals) => {
  const comp = get().composition;
  if (!comp) return;
  const removeMap = new Map<number, Set<number>>();
  removals.forEach(r => {
    if (!removeMap.has(r.trackIndex)) removeMap.set(r.trackIndex, new Set());
    removeMap.get(r.trackIndex)!.add(r.noteIndex);
  });
  const newTracks = comp.tracks.map((track, ti) => {
    const indices = removeMap.get(ti);
    if (!indices) return track;
    return { ...track, notes: track.notes?.filter((_, ni) => !indices.has(ni)) };
  });
  const newComp = { ...comp, tracks: newTracks };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

moveNotes: (moves) => {
  const comp = get().composition;
  if (!comp) return;
  const moveMap = new Map<string, string>();
  moves.forEach(m => moveMap.set(`${m.trackIndex}:${m.noteIndex}`, m.newTime));
  const newTracks = comp.tracks.map((track, ti) => ({
    ...track,
    notes: track.notes?.map((n, ni) => {
      const key = `${ti}:${ni}`;
      return moveMap.has(key) ? { ...n, time: moveMap.get(key)! } : n;
    }),
  }));
  const newComp = { ...comp, tracks: newTracks };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

addMeasure: () => {
  const comp = get().composition;
  if (!comp) return;
  const newComp = { ...comp, measures: comp.measures + 1 };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},

removeMeasure: () => {
  const comp = get().composition;
  if (!comp || comp.measures <= 1) return;
  const newComp = { ...comp, measures: comp.measures - 1 };
  const undoStack = [...get().undoStack, comp];
  set({ composition: newComp, undoStack, redoStack: [] });
},
```

- [ ] **Step 6: Verify build**

### Task 3: Edit Button on Transport + Keyboard Shortcut Suppression

**Files:**
- Modify: `src/components/Transport.tsx`
- Modify: `src/components/KeyboardShortcuts.tsx`

- [ ] **Step 1: Add Edit button to Transport**

After the undo/redo buttons, add:

```tsx
<button
  onClick={() => useStore.getState().openEditor()}
  disabled={!composition}
  className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream hover:bg-caramel/20 disabled:opacity-30 flex items-center justify-center transition-colors"
  title="Beat Editor"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
</button>
```

- [ ] **Step 2: Suppress shortcuts when editor is open**

In `KeyboardShortcuts.tsx`, add at the top of the handler:

```typescript
const state = useStore.getState();
if (state.editorOpen) return;
```

- [ ] **Step 3: Verify build**

### Task 4: BeatEditor Shell (overlay + layout)

**Files:**
- Create: `src/components/BeatEditor.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the BeatEditor overlay component**

```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/store/use-store';
import { EditorToolbar } from './EditorToolbar';
import { InstrumentBrowser } from './InstrumentBrowser';
import { EditorGrid } from './EditorGrid';
import { NotePopup } from './NotePopup';

export function BeatEditor() {
  const editorOpen = useStore(s => s.editorOpen);
  const closeEditor = useStore(s => s.closeEditor);
  const editorTool = useStore(s => s.editorTool);
  const setEditorTool = useStore(s => s.setEditorTool);

  // Editor keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    switch (e.key) {
      case '1': setEditorTool('pencil'); break;
      case '2': setEditorTool('eraser'); break;
      case '3': setEditorTool('select'); break;
      case 'Escape': closeEditor(); break;
    }
  }, [setEditorTool, closeEditor]);

  useEffect(() => {
    if (!editorOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorOpen, handleKeyDown]);

  if (!editorOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-espresso flex flex-col">
      {/* Toolbar */}
      <EditorToolbar />

      {/* Main area: browser + grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Instrument Browser */}
        <InstrumentBrowser />

        {/* Center: Editor Grid */}
        <div className="flex-1 overflow-hidden">
          <EditorGrid />
        </div>

        {/* Right: reserved for AI Advisor (Phase 2) */}
      </div>

      {/* Note popup (positioned absolutely) */}
      <NotePopup />
    </div>
  );
}
```

- [ ] **Step 2: Add BeatEditor to page.tsx**

Import and render after the studio layout:

```tsx
import { BeatEditor } from '@/components/BeatEditor';

// At the end of the normal layout return, before the closing </div>:
<BeatEditor />
```

Also add it to the fullscreen layout.

- [ ] **Step 3: Verify build**

---

## Chunk 2: EditorToolbar + InstrumentBrowser

### Task 5: EditorToolbar

**Files:**
- Create: `src/components/EditorToolbar.tsx`

- [ ] **Step 1: Create the toolbar component**

Renders: tool mode buttons (pencil/eraser/select), snap toggle (1/4, 1/8, 1/16), track actions (duplicate/delete/clear track, +/- bar), close button. All connected to store actions.

The toolbar is a horizontal bar at the top of the editor overlay, styled with `bg-roast border-b border-roast-light`. Each button group is separated by dividers. Active tool and active snap are highlighted with `bg-caramel/20 text-caramel`.

- [ ] **Step 2: Verify build**

### Task 6: InstrumentBrowser

**Files:**
- Create: `src/components/InstrumentBrowser.tsx`

- [ ] **Step 1: Create the browser component**

Renders: collapsible left sidebar (~200px). Search input at top. Accordion categories from `INSTRUMENT_CATEGORIES`. Each instrument shows a colored dot + name. Click adds a track via `addTrack()`. Collapse/expand toggle. Uses the existing `getInstrumentColor` for the dots.

- [ ] **Step 2: Verify build**

---

## Chunk 3: EditorGrid (the core piano roll)

### Task 7: EditorGrid — Basic Rendering

**Files:**
- Create: `src/components/EditorGrid.tsx`

- [ ] **Step 1: Create the grid with tracks, cells, notes, playhead**

Same visual structure as Timeline.tsx but as an independent component. Reads composition from store. Renders:
- Track labels on the left (sticky, with selected track indicator — caramel border)
- CSS background grid (same technique as Timeline — repeating-linear-gradient)
- Notes as positioned colored blocks
- Playhead line
- For drum tracks: 5 sub-rows (kick/snare/hihat/tom/cymbal)

Uses the same `timeToCol`, `colToTime`, `durationToWidth` helpers (copy from Timeline or extract to a shared util).

- [ ] **Step 2: Verify build — grid renders with existing composition data**

### Task 8: EditorGrid — Click-to-Place (Pencil Tool)

- [ ] **Step 1: Add click handler for placing/removing notes**

When `editorTool === 'pencil'`:
- Click empty cell → `addNote(trackIndex, { note: getDefaultNote(instrument), duration: editorSnap, time: colToTime(col), velocity: 0.7 })`
- Click existing note → open NotePopup (set a `popupNote` state with trackIndex, noteIndex, position)
- For drum tracks: click empty cell in sub-row → `addDrumHit(trackIndex, { drum: drumType, time: colToTime(col), velocity: 0.8 })`
- Click existing drum hit → `removeDrumHit(trackIndex, hitIndex)`

- [ ] **Step 2: Verify — can place and interact with notes**

### Task 9: EditorGrid — Eraser Tool

- [ ] **Step 1: Add eraser handler**

When `editorTool === 'eraser'`:
- Click note → `removeNote(trackIndex, noteIndex)`
- Click drum hit → `removeDrumHit(trackIndex, hitIndex)`
- Drag → track mouse movement, delete any note the cursor crosses

- [ ] **Step 2: Verify — eraser deletes notes**

### Task 10: EditorGrid — Note Resize

- [ ] **Step 1: Add resize drag on note right edge**

When hovering near the right 6px of a note, cursor changes to `col-resize`. Mousedown starts a drag — track deltaX, convert to snap-quantized duration, call `resizeNote()`. Visual feedback: the note width follows the cursor during drag.

- [ ] **Step 2: Verify — can drag to resize notes**

### Task 11: EditorGrid — Select Tool

- [ ] **Step 1: Add selection rectangle + batch operations**

When `editorTool === 'select'`:
- Mousedown + drag draws a selection rectangle (dashed border div)
- On mouseup, find all notes within the rectangle bounds → store as `selectedNotes` state
- Selected notes get a highlight (dashed border + brighter color)
- Delete/Backspace → `removeNotes(selectedNotes)`
- Drag selected notes → `moveNotes()` with time offset
- Click outside → clear selection

- [ ] **Step 2: Verify — can select, delete, move groups of notes**

---

## Chunk 4: NotePopup + Polish

### Task 12: NotePopup

**Files:**
- Create: `src/components/NotePopup.tsx`

- [ ] **Step 1: Create the popup component**

A small floating card that appears near a clicked note. Shows:
- Note name (dropdown or text: C4, D#3, etc.)
- Velocity slider (0.1–1.0, step 0.05)
- Duration dropdown (1n, 2n, 4n, 8n, 16n)
- Delete button

Position calculated from the click event coordinates. Dismisses on click-outside or Escape.

All changes call `updateNote()` on the store.

- [ ] **Step 2: Verify — popup appears, edits work, dismisses correctly**

### Task 13: Integration + Final Polish

**Files:**
- Modify: `src/app/page.tsx` (verify BeatEditor renders in both normal and fullscreen layouts)

- [ ] **Step 1: Verify full flow**

1. Generate a beat via chat or genre preset
2. Click Edit button on transport → editor overlay opens
3. Click instrument in browser → new track appears
4. Click cells to place notes → notes appear
5. Click note → popup opens, can edit velocity/pitch/duration
6. Switch to eraser → can delete notes by clicking
7. Switch to select → can drag-select and batch delete
8. Drag note right edge → resizes
9. Click +Bar/-Bar → composition extends/shrinks
10. Press Escape → editor closes
11. Press Play → music plays with all edits
12. Undo/redo works for all operations

- [ ] **Step 2: Verify build passes**

Run: `npx next build` — must pass with zero errors.

---

## Execution Notes

- **Do NOT modify Timeline.tsx** — the editor grid is a separate component
- **Do NOT modify the audio engine** — store actions handle when to reload
- **Style with Tailwind** following existing app conventions: `bg-roast`, `bg-espresso`, `text-cream`, `text-warm-dim`, `border-roast-light`, etc.
- **All new components are `'use client'`** — they use hooks and browser APIs
- The `addNote` action already exists in the store — it currently calls `loadComposition()`. For the editor, note-level edits should use the new lightweight actions (`updateNote`, `moveNote`, etc.) that do direct state sets. The existing `addNote` will also be updated to do a direct state set (matching the `removeNote` pattern).
- **Refactor existing `addNote`** to match the `removeNote` pattern: direct `set()` + background `engine.loadComposition()`, not through `loadComposition()`.
