# Beat Editor — Design Spec

**Date:** 2026-03-16
**Status:** Reviewed & Final
**Goal:** A fullscreen manual beat editor overlay for BrewBeats that lets users place, edit, resize, and delete notes on a grid, browse/add instruments, and manage tracks — like a standard DAW piano roll, built on top of the existing composition system.

---

## 1. Scope

**Phase 1 (this spec):** Manual Beat Editor — fullscreen overlay with instrument browser, enhanced piano roll, editing tools, note properties popup.

**Phase 2 (future):** AI Music Advisor — right-panel chatbot that reviews compositions, highlights notes, gives recommendations with interactive preview.

**Phase 3 (future):** Interactive Preview System — accept/reject AI suggestions, compare with original, A/B playback.

This spec covers Phase 1 only. The layout is designed to accommodate Phases 2 and 3 without refactoring.

---

## 2. Entry Point

- An **Edit button** (pencil icon) is added to the transport bar, next to the undo/redo buttons.
- Clicking it opens a **fullscreen overlay** (`position: fixed; inset: 0; z-index: 300`) on top of the studio view.
- **Escape key** or **X button** closes the overlay, returning to the normal studio view.
- The overlay is only available when a composition exists (`composition !== null`).
- All edits are **live** — they modify the same Zustand store composition. No separate "editor state." No "save" step.

---

## 3. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ TOOLBAR: [Pencil][Eraser][Select] | Snap:[1/4][1/8][1/16]   │
│          | [Dup Track][Del Track][Clear Track]      [X Close] │
├──────────┬───────────────────────────────────────┬───────────┤
│          │                                       │           │
│  INSTR   │         EDITOR GRID                   │  (empty)  │
│  BROWSER │     Enhanced piano roll               │  Reserved │
│          │     with editing capabilities         │  for AI   │
│  ~200px  │     flex: 1 (fills remaining)         │  Advisor  │
│          │                                       │  Phase 2  │
│  Search  │     Rows = tracks                     │           │
│  [+Add]  │     Cols = time subdivisions          │  0px now  │
│  Categs  │     Notes = colored blocks            │  ~300px   │
│          │                                       │  later    │
├──────────┴───────────────────────────────────────┴───────────┤
│  TRANSPORT BAR (existing, unchanged, reused)                  │
├──────────────────────────────────────────────────────────────┤
│  MIXER (existing, unchanged, collapsed by default in editor)  │
└──────────────────────────────────────────────────────────────┘
```

- **Toolbar:** Fixed top bar within the overlay. Contains tool modes, snap grid controls, track actions, close button.
- **Instrument Browser:** Left sidebar, ~200px, collapsible. Categorized instrument list with search.
- **Editor Grid:** Center area, fills remaining horizontal space. Enhanced version of the current timeline with editing capabilities.
- **Right panel:** Empty in Phase 1 (0px). Reserved for AI Advisor in Phase 2. The flexbox layout naturally accommodates it.
- **Transport:** The existing transport bar at the bottom. Unchanged. Reused as-is.
- **Mixer:** The existing mixer, collapsed by default when editor is open. Can be expanded.

---

## 4. Instrument Browser (left panel)

### Structure
- Collapsible sidebar (~200px expanded, ~40px collapsed showing only icons)
- Toggle button (chevron) to collapse/expand

### Content
- **Search bar** at top — filters instruments by name
- **Categories** (collapsible accordion):
  - Keys: piano, electric_piano, organ, harpsichord, celesta, clavinet, melodica
  - Bass: bass, sub_bass, synth_bass, 808_bass, upright_bass, fretless_bass
  - Drums: drums (single entry — adds a drum track)
  - Strings: violin, viola, cello, double_bass, strings, harp
  - Brass: trumpet, trombone, french_horn, tuba, flugelhorn
  - Woodwind: flute, clarinet, oboe, sax, bassoon, recorder, pan_flute
  - Synth/Lead: synth, saw_lead, square_lead, arp_synth, acid_lead
  - Pads: warm_pad, string_pad, shimmer_pad, celestial_pad
  - Percussion: marimba, xylophone, vibraphone, kalimba, steel_drums, glockenspiel
  - World: sitar, koto, djembe, tabla, shakuhachi, erhu
  - Guitar: guitar, banjo, ukulele, mandolin
- Each item shows: colored dot (instrument color) + name
- **Click an instrument** → adds a new track to the composition with default volume 0.7, empty notes array
- The new track immediately appears as a new row in the editor grid

### Track Row Actions
- Each track row in the grid has a small **"+"** button in the label area
- Clicking it opens a mini picker (same instrument list) to **add another instance** of any instrument
- Right-click on a track label → context menu: Duplicate Track, Delete Track, Clear Notes

---

## 5. Editor Grid (enhanced piano roll)

### Base
- Same data source as the current Timeline component — reads `composition.tracks` from the store.
- Same visual structure: track labels on the left (sticky), time grid in the center, playhead line.
- Same zoom (Ctrl+scroll), same scroll behavior.

### Editing Capabilities (new)

**Click-to-place (Pencil mode, default):**
- Click an empty cell → places a note at that position
  - Pitch: default for that instrument (from `DEFAULT_NOTES` map)
  - Duration: matches current snap setting (1/4, 1/8, or 1/16)
  - Velocity: 0.7 default
- Click an existing note → opens Note Properties popup (see Section 7)
- For drum tracks: click places a drum hit at that time position

**Eraser mode:**
- Click any note → deletes it immediately
- Click and drag → deletes all notes touched

**Select mode:**
- Click and drag on the grid → draws a selection rectangle
- All notes within the rectangle are selected (highlighted border)
- Selected notes can be:
  - **Moved** — drag the selection to a new position (snaps to grid)
  - **Deleted** — press Delete/Backspace key
  - **Copied** — Ctrl+C, then Ctrl+V pastes at the playhead position
- Click outside selection to deselect

**Drag to resize:**
- In Pencil or Select mode, hover over the right edge of a note → cursor changes to resize
- Drag left/right to change duration (snaps to grid setting)

**Right-click:**
- On a note → delete it (quick alternative to Eraser)
- On empty space → no action

### Snap Grid
- Controls the minimum time resolution for placing/moving/resizing notes
- Options: 1/4 note (quarter), 1/8 note (eighth), 1/16 note (sixteenth)
- Default: 1/16 (finest, matches current grid)
- Displayed as toggle buttons in the toolbar

### Visual Differences from Main Timeline
- Notes have visible **resize handles** on the right edge (small lighter bar)
- Hovered notes get a subtle highlight/glow
- Selected notes (in Select mode) get a dashed border
- The grid cursor changes based on active tool (crosshair for pencil, eraser icon, default for select)

---

## 6. Editing Toolbar (top bar)

### Tool Modes (left section)
- **Pencil** (default) — click to place, click note to edit properties
- **Eraser** — click to delete
- **Select** — drag to select, move, copy, delete groups
- Active tool is highlighted with accent color
- Keyboard shortcuts: `1` = Pencil, `2` = Eraser, `3` = Select

### Snap Controls (center section)
- Three toggle buttons: `1/4`, `1/8`, `1/16`
- Active snap is highlighted
- Affects note placement, movement, and resize resolution

### Track Actions (center-right section)
- **Duplicate Track** — duplicates the currently selected track (all notes copied)
- **Delete Track** — removes the currently selected track
- **Clear Notes** — removes all notes from the currently selected track, keeps the instrument
- "Currently selected track" = the track row the user last clicked/interacted with

### Close Button (right)
- X icon, closes the editor overlay
- Keyboard: Escape

---

## 7. Note Properties Popup

- Appears when clicking an existing note in Pencil mode
- Positioned near the clicked note (above or below, avoiding overflow)
- Small card (~180px wide):
  - **Note name** display (e.g., "C4", "Eb3") — editable via a dropdown or text input
  - **Velocity slider** — range 0.1 to 1.0, step 0.05
  - **Duration display** (e.g., "4n", "8n") — editable via dropdown
  - **Delete button** — removes the note
- Dismisses on: click outside, Escape, or clicking another note (which opens popup for that note)

---

## 8. Store Additions

New actions added to the Zustand store (all operate on the existing `composition` object):

```typescript
// Track management
addTrack: (instrument: string) => void;          // Add new track with instrument
deleteTrack: (trackIndex: number) => void;        // Remove track
duplicateTrack: (trackIndex: number) => void;     // Clone track + notes
clearTrack: (trackIndex: number) => void;         // Remove all notes, keep instrument

// Note editing
addNote: (trackIndex: number, note: Note) => void;           // Already exists — keep
removeNote: (trackIndex: number, noteIndex: number) => void;  // Already exists — keep
updateNote: (trackIndex: number, noteIndex: number, updates: Partial<Note>) => void;  // New: edit pitch/vel/dur
moveNote: (trackIndex: number, noteIndex: number, newTime: string) => void;            // New: change time
resizeNote: (trackIndex: number, noteIndex: number, newDuration: string) => void;      // New: change duration

// Drum editing
addDrumHit: (trackIndex: number, hit: DrumHit) => void;       // New
removeDrumHit: (trackIndex: number, hitIndex: number) => void; // New

// Editor state
editorOpen: boolean;
openEditor: () => void;
closeEditor: () => void;
selectedTrackIndex: number | null;
setSelectedTrack: (index: number | null) => void;
editorTool: 'pencil' | 'eraser' | 'select';
setEditorTool: (tool: 'pencil' | 'eraser' | 'select') => void;
editorSnap: '4n' | '8n' | '16n';
setEditorSnap: (snap: '4n' | '8n' | '16n') => void;
```

**Important:** All note/track editing actions should:
1. Update the composition in the store
2. Push to undo stack (with debounce — batch rapid edits into one undo entry)
3. NOT reload the entire audio engine for single-note edits. Only reload when tracks are added/removed.

---

## 9. New Files

| File | Purpose |
|------|---------|
| `src/components/BeatEditor.tsx` | Fullscreen overlay wrapper, layout, keyboard shortcuts |
| `src/components/EditorToolbar.tsx` | Top toolbar: tools, snap, track actions, close |
| `src/components/InstrumentBrowser.tsx` | Left sidebar: search, categories, instrument list |
| `src/components/EditorGrid.tsx` | Enhanced piano roll with click-to-place, resize, select |
| `src/components/NotePopup.tsx` | Note properties popup (pitch, velocity, duration, delete) |

### Files Modified
| File | Changes |
|------|---------|
| `src/store/use-store.ts` | Add editor state + new actions (addTrack, deleteTrack, etc.) |
| `src/components/Transport.tsx` | Add Edit button (pencil icon) next to undo/redo |
| `src/app/page.tsx` | Render `<BeatEditor />` when `editorOpen` is true |

### Files NOT Modified
- Timeline.tsx — the main timeline stays as-is. The editor has its own grid component.
- Mixer.tsx — unchanged
- ChatPanel.tsx — unchanged
- Audio engine — unchanged (except store actions call loadComposition after track add/remove)

---

## 10. Keyboard Shortcuts (within editor)

| Key | Action |
|-----|--------|
| `1` | Pencil tool |
| `2` | Eraser tool |
| `3` | Select tool |
| `Delete` / `Backspace` | Delete selected notes |
| `Ctrl+C` | Copy selected notes |
| `Ctrl+V` | Paste at playhead |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Space` | Play/Pause |
| `Escape` | Close editor (or deselect if selection active) |

---

## 11. Phase 2 Compatibility

The layout is designed for Phase 2 (AI Advisor) without refactoring:

- The editor grid is `flex: 1` between left browser and a future right panel
- Phase 2 adds a `~300px` right panel (AI chat) — the grid automatically shrinks
- The AI chat component will be rendered inside `BeatEditor.tsx` when Phase 2 is built
- The AI can access the same composition data and highlight notes via shared state
- A `highlightedNotes` array in the store can be set by the AI advisor, read by the grid to render highlights

---

## 12. UX Principles

- **Live editing** — no save button. Everything is immediate.
- **Undo everything** — every action is undoable.
- **Non-destructive** — closing the editor doesn't lose changes.
- **Progressive disclosure** — basic click-to-place works without learning tools. Power features (select, resize, velocity) are discoverable but not required.
- **Consistent with existing app** — same color scheme, same glass-card style, same font, same transport.

---

## 13. Engine Reload Strategy

**Problem:** Existing `addNote`, `removeNote`, and `updateNote` call `loadComposition()` which rebuilds the entire audio engine — too expensive for real-time note editing.

**Solution — two tiers:**

1. **Note-level edits** (addNote, removeNote, updateNote, moveNote, resizeNote, addDrumHit, removeDrumHit): Update state via `set()` directly. Do NOT call `engine.loadComposition()`. Instead, call `engine.loadComposition()` once when the user **closes the editor** or **presses play** — a single rebuild at a natural boundary.

2. **Track-level edits** (addTrack, deleteTrack, duplicateTrack): These change the instrument list, so they DO call `engine.loadComposition()` after updating state.

**Undo batching:** All note edits within a 500ms window are batched into a single undo entry. A `pendingUndoTimer` in the store collects edits and pushes to `undoStack` when the timer fires.

---

## 14. Duplicate Instrument Tracks — Mixer Key Fix

**Problem:** The mixer state (`trackVolumes`, `trackMutes`, `trackSolos`) is keyed by instrument name. Two piano tracks would share the same mixer key.

**Solution:** Key mixer state by `trackIndex` (number) instead of instrument name. The `initMixerState` function and all mixer-related store actions (`setTrackVolume`, `setTrackMute`, `setTrackSolo`) will be migrated to use track index.

**Migration:** This is a breaking change to the mixer. The `setTrackEffect` function in the engine also uses instrument name for lookup. Both the store and engine will be updated to use track index during the editor implementation. The existing `trackKeys()` helper in the engine already maps `instrument_trackIndex` keys — this pattern extends naturally.

---

## 15. Default Notes Fallback

**Problem:** Many instruments in the browser don't have entries in the `DEFAULT_NOTES` map.

**Solution:** Add a category-based fallback:

```typescript
function getDefaultNote(instrument: string): string {
  // Exact match first
  if (DEFAULT_NOTES[instrument]) return DEFAULT_NOTES[instrument];
  // Category heuristics
  const name = instrument.toLowerCase();
  if (/bass|sub|808|tuba|contrabass/.test(name)) return 'C2';
  if (/drum/.test(name)) return 'C2'; // drums use pattern, not notes
  if (/pad|ambient|drone|texture/.test(name)) return 'C3';
  if (/lead|synth|arp|acid|saw|square/.test(name)) return 'C4';
  if (/flute|piccolo|whistle|recorder/.test(name)) return 'C5';
  if (/violin|fiddle/.test(name)) return 'G4';
  if (/cello|viola/.test(name)) return 'C3';
  if (/guitar|banjo|ukulele|mandolin/.test(name)) return 'E3';
  if (/brass|trumpet|horn|trombone/.test(name)) return 'C4';
  if (/sitar|koto|erhu|shakuhachi/.test(name)) return 'C4';
  return 'C4'; // safe default
}
```

This replaces direct `DEFAULT_NOTES[instrument]` lookups throughout the editor.

---

## 16. Keyboard Shortcut Conflict Resolution

**Problem:** The existing `KeyboardShortcuts.tsx` and the editor's shortcuts both listen on `window`.

**Solution:** In `KeyboardShortcuts.tsx`, check `editorOpen` from the store at the top of the handler:

```typescript
const state = useStore.getState();
if (state.editorOpen) return; // Let the editor handle all shortcuts
```

The editor component (`BeatEditor.tsx`) handles its own shortcuts internally. When the editor is closed, the existing shortcuts resume normally.

---

## 17. Batch Note Operations

For multi-note select operations, add batch actions:

```typescript
removeNotes: (removals: { trackIndex: number; noteIndex: number }[]) => void;
moveNotes: (moves: { trackIndex: number; noteIndex: number; newTime: string }[]) => void;
```

These apply all changes in a single state update and push one undo entry. Movement is **horizontal only** (time axis) — moving notes between tracks is not supported in Phase 1.

---

## 18. Selected Track Indicator

The currently selected track is shown with:
- A **caramel left border** (3px) on the track label area
- A **subtle background tint** (`rgba(200,149,108,0.06)`) on the entire track row
- Clicking a track row sets it as selected

---

## 19. Drum Track Editing

Drum tracks display differently in the editor:
- The grid shows **5 sub-rows** within the track: Kick, Snare, Hi-hat, Tom, Cymbal
- Each sub-row is labeled with the drum name
- Clicking a cell in a sub-row places a hit for that drum type at that time
- Clicking an existing hit deletes it (toggle behavior)
- No Note Properties popup for drums — hits only have time and velocity (default 0.8)
- Right-click a drum hit to adjust velocity via a mini slider

---

## 20. Composition Length Extension

- The toolbar includes an **"+ Bar"** button that adds one measure to the composition
- A **"- Bar"** button removes the last measure (if > 1 measure)
- When a user places a note near the last column of the grid, a subtle "+" indicator appears suggesting they can add more measures
- Auto-extend is NOT used (to prevent accidental extension)
