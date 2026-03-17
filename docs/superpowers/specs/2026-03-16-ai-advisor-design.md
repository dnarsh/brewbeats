# AI Music Advisor — Design Spec (Phase 2)

**Date:** 2026-03-16
**Status:** Reviewed & Final
**Goal:** A collapsible right-panel AI chatbot inside the Beat Editor that reviews compositions, suggests changes via editable ghost notes, and lets users accept/reject suggestions per-note or per-group — with audio preview.

**Depends on:** Phase 1 Beat Editor (complete)

---

## 1. Location & Layout

- **Right panel** inside the Beat Editor overlay (~300px wide)
- Collapsed by default (0px) — toggle via sparkle/AI icon in the EditorToolbar
- The EditorGrid is `flex: 1` and naturally shrinks when the advisor opens

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar: [tools] [snap] [actions] [bars] [undo/redo] [AI✨] [X] │
├────────┬──────────────────────────────────────┬─────────────┤
│ Instr  │                                      │  AI Advisor │
│ Browser│         Editor Grid                  │  ─────────  │
│        │   (real notes + ghost notes)         │  [cards]    │
│        │                                      │  [cards]    │
│        │                                      │  ─────────  │
│        │                                      │  [Accept All│
│        │                                      │  Reject All]│
│        │                                      │  ─────────  │
│        │                                      │  [input bar]│
└────────┴──────────────────────────────────────┴─────────────┘
```

---

## 2. AI Advisor Panel

### Header
- "AI Advisor" title
- Collapse button (chevron)
- "Clear" button — removes all messages, ghost notes, and highlights

### Cards Area (scrollable)
- Each AI response generates one or more **Suggestion Cards**
- Also shows AI text messages (general advice that doesn't map to specific notes)
- Most recent at bottom, scrolls to latest

### Global Controls
- **"Accept All"** button — accepts all pending ghost notes across all groups
- **"Reject All"** button — removes all ghost notes
- These appear as a sticky bar above the input when ghost notes exist

### Input Bar
- Text input at bottom: "Ask about your composition..."
- Send button (or Enter to send)
- Example prompts: "What's wrong with this?", "Suggest a melody", "The bass sounds off", "Add more groove to the drums"

---

## 3. Suggestion Cards

Each card represents a logical group of related suggestions.

### Structure
```
┌─────────────────────────────────┐
│ 🎵 Add Bass Fill                │  ← title (group name)
│                                 │
│ The bass is empty in measure 3. │  ← description
│ Adding a fill bridges the gap.  │
│                                 │
│ [C2 2:2:0] [E2 2:3:0] [G2 3:0] │  ← note pills (clickable)
│                                 │
│ [✓ Accept Group] [✗ Reject]     │  ← group actions
└─────────────────────────────────┘
```

### Behavior
- **Note pills** — each shows the ghost note's pitch + time. Click to toggle accept/reject for that individual note. Accepted = green tint, rejected = red strikethrough, pending = default.
- **Accept Group** — accepts all pending notes in this group (converts ghost → real)
- **Reject Group** — removes all ghost notes in this group from the grid
- **Completed cards** — once fully accepted or rejected, the card dims and shows "Applied" or "Dismissed" label
- Cards persist in the scroll history until "Clear" is pressed

---

## 4. Ghost Notes

### Visual
- Rendered on the EditorGrid alongside real notes
- **Appearance:** Same shape as real notes but with:
  - Opacity: 0.35
  - Dashed border (2px dashed, instrument color at 60% opacity)
  - Subtle shimmer/pulse animation (CSS)
  - Small "AI" badge or sparkle icon in top-left corner of the note
- Color inherits from the track's instrument color (so they look like they belong)

### Interaction
- **Fully editable** — user can:
  - Click to open NotePopup (change pitch, velocity, duration)
  - Drag to move (when select tool is implemented)
  - Delete via eraser tool or right-click
- **Per-note accept/reject:**
  - Right-click ghost note → context options: Accept / Reject / Edit
  - Or click the note pill in the suggestion card
  - Accepting converts it to a real note (full opacity, solid, added to composition)
  - Rejecting removes it from the grid and the suggestion card

### Grouping
- Each ghost note has a `groupId` linking it to a suggestion card
- Groups are labeled by the AI (e.g., "Bass Fill", "Chord Fix", "Add Melody")
- Editing a ghost note doesn't break its group membership
- If all notes in a group are accepted/rejected, the card auto-completes

### Data Structure
```typescript
interface GhostNote {
  trackIndex: number;
  note: string;       // pitch: "C4"
  duration: string;   // "4n"
  time: string;       // "2:1:0"
  velocity: number;
  groupId: string;    // links to suggestion card
  status: 'pending' | 'accepted' | 'rejected';
}
```

---

## 5. Playback Preview

- When user plays from the main app (closes editor or uses main transport):
  - The `play()` function in the store creates a **temporary merged composition** that includes both real notes AND pending ghost notes
  - This merged composition is passed to `engine.play(mergedComp)`
  - The actual `composition` in the store is NOT modified
- When ghost notes are accepted, they become real notes in the actual composition
- When rejected, they're removed — next playback won't include them

### Implementation
- Helper function: `mergeGhostNotes(composition, ghostNotes) → Composition`
- Creates a deep clone, adds ghost notes to the appropriate tracks
- Only includes ghosts with `status === 'pending'` (not yet accepted/rejected)
- Called inside `play()` before passing to the engine

---

## 6. Highlight System

- The AI can highlight existing notes to point out issues
- Highlighted notes get a colored border/glow (different from ghost notes):
  - **Yellow highlight** — "look at this" (attention)
  - **Red highlight** — "this is a problem" (clash, wrong key)
  - **Green highlight** — "this is good" (positive feedback)
- Highlights are stored as `{ trackIndex, noteIndex, color }` in the store
- Cleared when the user sends a new message or clicks "Clear"

---

## 7. API Endpoint

### `POST /api/advisor`

**Request:**
```json
{
  "composition": { ... },
  "question": "What should I add?",
  "ghostNotes": [ ... ],
  "model": "meta/llama-4-maverick-17b-128e-instruct"
}
```

**System Prompt** (separate from the main composer prompt):
- Role: Music advisor/reviewer, NOT a composer
- Analyzes the composition structure, harmony, rhythm, instrumentation
- Returns structured JSON with suggestion groups
- Can highlight existing notes that need attention
- Gives constructive, beginner-friendly advice

**Response format:**
```json
{
  "message": "Your beat has a solid foundation. Here are some ideas to make it fuller:",
  "suggestions": [
    {
      "id": "sg_1",
      "title": "Add Bass Fill in Measure 3",
      "description": "The bass drops out in measure 3 leaving a gap. A simple fill would keep the groove moving.",
      "type": "add",
      "ghostNotes": [
        { "trackIndex": 2, "note": "C2", "duration": "8n", "time": "2:0:0", "velocity": 0.7 },
        { "trackIndex": 2, "note": "E2", "duration": "8n", "time": "2:1:0", "velocity": 0.6 }
      ]
    },
    {
      "id": "sg_2",
      "title": "Fix Clashing Notes",
      "description": "The piano plays an F# in measure 2 but the key is Am — this creates a harsh dissonance.",
      "type": "highlight",
      "highlights": [
        { "trackIndex": 0, "noteIndex": 5, "color": "red" }
      ]
    }
  ]
}
```

**Suggestion types:**
- `add` — ghost notes to be added to the grid
- `remove` — highlights existing notes that should be deleted (red highlight)
- `modify` — highlights notes + suggests replacement ghost notes
- `highlight` — just points out notes with colored highlights (no changes)

### Streaming
- Same SSE streaming as the main generate endpoint
- The advisor response is parsed incrementally
- Cards appear as they're parsed from the stream

---

## 8. Store Additions

```typescript
// Ghost notes
ghostNotes: GhostNote[];
addGhostNotes: (notes: GhostNote[]) => void;
removeGhostNotesByGroup: (groupId: string) => void;
acceptGhostNote: (index: number) => void;
rejectGhostNote: (index: number) => void;
acceptGroup: (groupId: string) => void;
rejectGroup: (groupId: string) => void;
acceptAllGhosts: () => void;
rejectAllGhosts: () => void;
editGhostNote: (index: number, updates: Partial<GhostNote>) => void;
clearGhostNotes: () => void;

// Highlights
highlightedNotes: { trackIndex: number; noteIndex: number; color: string }[];
setHighlights: (highlights: typeof highlightedNotes) => void;
clearHighlights: () => void;

// Advisor UI
advisorOpen: boolean;
advisorMessages: AdvisorMessage[];
toggleAdvisor: () => void;
clearAdvisor: () => void;
isAdvisorGenerating: boolean;
askAdvisor: (question: string) => Promise<void>;
```

---

## 9. New Files

| File | Purpose |
|------|---------|
| `src/components/AIAdvisor.tsx` | Right panel: header, cards area, global controls, input bar |
| `src/components/SuggestionCard.tsx` | Individual card: title, description, note pills, accept/reject |
| `src/app/api/advisor/route.ts` | API endpoint with advisor-specific system prompt |
| `src/lib/advisor-prompt.ts` | System prompt for the music advisor |
| `src/lib/ghost-notes.ts` | Helper: `mergeGhostNotes()`, ghost note utilities |
| `src/types/advisor.ts` | Types: GhostNote, Suggestion, AdvisorMessage |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/BeatEditor.tsx` | Render `<AIAdvisor />` in right panel |
| `src/components/EditorToolbar.tsx` | Add AI toggle button (sparkle icon) |
| `src/components/EditorGrid.tsx` | Render ghost notes + highlight overlays on existing notes |
| `src/components/NotePopup.tsx` | Handle ghost note editing (same popup, different styling) |
| `src/store/use-store.ts` | Ghost note state, highlight state, advisor actions, modified `play()` to merge ghosts |

---

## 10. Advisor System Prompt (summary)

The advisor prompt should instruct the AI to:
- Analyze the composition's key, chord progression, rhythm, and instrumentation
- Identify issues: wrong key notes, empty gaps, clashing frequencies, repetitive patterns
- Suggest specific notes with exact pitch, duration, time, velocity, and track index
- Group suggestions logically (one group per musical idea)
- Be constructive and beginner-friendly — explain WHY, not just what
- Return structured JSON matching the response format above
- Keep responses concise — max 3-4 suggestion groups per response

---

## 11. UX Principles

- **Non-destructive** — ghost notes never modify the real composition until accepted
- **Audible preview** — user can hear ghost notes in playback before committing
- **Per-note control** — accept or reject individual notes, not just all-or-nothing
- **Editable suggestions** — user can tweak AI suggestions before accepting
- **Beginner-friendly** — advice explains music concepts simply
- **Dismissible** — the advisor panel can be closed at any time, ghost notes persist until accepted/rejected

---

## 12. Review Fixes

### Fix 1: GhostNote ID (Critical)

Every `GhostNote` has a unique `id: string` field (UUID). All store actions operate by ID, not array index:

```typescript
interface GhostNote {
  id: string;           // unique ID (generated via crypto.randomUUID or counter)
  trackIndex: number;
  note: string;
  duration: string;
  time: string;
  velocity: number;
  groupId: string;
  status: 'pending' | 'accepted' | 'rejected';
  replacesNote?: { trackIndex: number; time: string; note: string };  // for "modify" type
}
```

Store actions updated:
- `acceptGhostNote(id: string)` — finds by ID, not index
- `rejectGhostNote(id: string)` — same
- `editGhostNote(id: string, updates)` — same

### Fix 2: Session Persistence

Ghost notes and advisor messages are **ephemeral** — intentionally NOT persisted to session storage. Rationale:
- Ghost notes are temporary suggestions, not committed work
- If the user refreshes, the conversation context is lost anyway
- Persisting partial AI suggestions could lead to stale/confusing state on reload

This is explicitly documented. When a session loads, `ghostNotes: []`, `advisorMessages: []`, `highlightedNotes: []`.

### Fix 3: Highlight by Time+Pitch (Critical)

Highlights use time+pitch keys instead of fragile `noteIndex`:

```typescript
interface NoteHighlight {
  trackIndex: number;
  time: string;       // "2:1:0"
  note?: string;      // "C4" — for melodic tracks. Omit for drums.
  drum?: string;      // "kick" — for drum tracks. Omit for melodic.
  color: 'yellow' | 'red' | 'green';
}
```

The EditorGrid matches highlights to notes by `trackIndex + time + note/drum` — stable regardless of array reordering.

### Fix 4: Play Merge Strategy

A `getPlayableComposition()` helper is used consistently:

```typescript
function getPlayableComposition(comp: Composition, ghostNotes: GhostNote[]): Composition {
  const pending = ghostNotes.filter(g => g.status === 'pending');
  if (pending.length === 0) return comp;
  const merged = JSON.parse(JSON.stringify(comp));
  for (const ghost of pending) {
    const track = merged.tracks[ghost.trackIndex];
    if (track?.notes) track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
    else if (track?.pattern && ghost.drum) track.pattern.push({ drum: ghost.drum, time: ghost.time, velocity: ghost.velocity });
  }
  return merged;
}
```

Used in `play()` and anywhere the engine needs audio data. The engine is always loaded with the playable composition (real + pending ghosts).

### Fix 5: Undo for Accept/Reject

All accept/reject actions push to undo stack before modifying the composition:
- `acceptGhostNote` → pushes current comp to undo, then adds the note to real composition
- `acceptGroup` → pushes once, then adds all group notes
- `rejectGroup` → just removes ghost notes (no composition change, no undo needed)

### Fix 6: Modify Type — Auto-Remove

When a `modify` suggestion is accepted, the ghost note's `replacesNote` field identifies the original note to remove. Accepting auto-deletes the original and adds the replacement. One undo entry covers both operations.

### Fix 7: Remove Type — Apply Button

`remove`-type suggestion cards have an "Apply Removal" button that deletes the highlighted notes from the composition (with undo). The button is styled in red to indicate destructive action.

### Fix 8: Streaming — Two-Phase

The advisor response uses two-phase parsing:
1. **Phase 1:** Stream the `message` text in real time (shown as it arrives in the panel)
2. **Phase 2:** Parse the complete `suggestions` JSON array after the stream finishes

This avoids incremental JSON parsing complexity. The advisor feels responsive (text appears immediately) while suggestions/ghost notes appear once the full response is received.

### Fix 9: Rate Limiting

`askAdvisor()` returns early if `isAdvisorGenerating` is true. The input bar is disabled and shows "Thinking..." during generation.

### Fix 10: Ghost Note Cap

Maximum 50 pending ghost notes. If a new suggestion would exceed this, the oldest fully-rejected group is auto-cleared. If still over, a warning appears: "Too many pending suggestions. Accept or reject some before asking again."

### Fix 11: AdvisorMessage Type

```typescript
interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // text message
  suggestions?: Suggestion[];  // attached suggestion groups (assistant only)
  timestamp: number;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'add' | 'remove' | 'modify' | 'highlight';
  ghostNotes?: GhostNote[];
  highlights?: NoteHighlight[];
  status: 'pending' | 'applied' | 'dismissed';
}
```

### Fix 12: Responsive Panel Width

Advisor panel: `width: min(300px, 28vw)`. Minimum supported viewport: 1024px. Below that, the advisor collapses to icon-only.
