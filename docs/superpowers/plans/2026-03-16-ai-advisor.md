# AI Music Advisor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collapsible right-panel AI chatbot inside the Beat Editor that reviews compositions, suggests changes via editable ghost notes on the grid, and lets users accept/reject per-note or per-group.

**Architecture:** New API endpoint (`/api/advisor`) with a music-reviewer system prompt returns structured JSON with suggestion groups. Ghost notes are stored in Zustand as ephemeral state, rendered as semi-transparent dashed notes on the EditorGrid. A `getPlayableComposition()` helper merges ghost notes for audio preview. The advisor panel is a React component in the right side of the BeatEditor layout.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, SSE streaming (existing pattern)

**Spec:** `docs/superpowers/specs/2026-03-16-ai-advisor-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/types/advisor.ts` | GhostNote, NoteHighlight, Suggestion, AdvisorMessage interfaces |
| `src/lib/advisor-prompt.ts` | System prompt for the music advisor role |
| `src/lib/ghost-notes.ts` | `getPlayableComposition()` helper, ghost note utilities |
| `src/app/api/advisor/route.ts` | POST endpoint — sends composition + question to LLM, returns structured suggestions |
| `src/components/AIAdvisor.tsx` | Right panel: header, cards area, global accept/reject, input bar |
| `src/components/SuggestionCard.tsx` | Individual suggestion card with group actions + note pills |

### Modified Files
| File | Changes |
|------|---------|
| `src/store/use-store.ts` | Ghost note state, highlight state, advisor state + actions, modified `play()` |
| `src/components/BeatEditor.tsx` | Render AIAdvisor in right panel |
| `src/components/EditorToolbar.tsx` | Add AI toggle button |
| `src/components/EditorGrid.tsx` | Render ghost notes + highlight overlays |

---

## Chunk 1: Types + Ghost Note Utilities + Store

### Task 1: Advisor Types

**Files:**
- Create: `src/types/advisor.ts`

- [ ] **Step 1: Create type definitions**

```typescript
export interface GhostNote {
  id: string;
  trackIndex: number;
  note: string;
  duration: string;
  time: string;
  velocity: number;
  groupId: string;
  status: 'pending' | 'accepted' | 'rejected';
  replacesNote?: { trackIndex: number; time: string; note: string };
}

export interface NoteHighlight {
  trackIndex: number;
  time: string;
  note?: string;
  drum?: string;
  color: 'yellow' | 'red' | 'green';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'add' | 'remove' | 'modify' | 'highlight';
  ghostNotes?: GhostNote[];
  highlights?: NoteHighlight[];
  status: 'pending' | 'applied' | 'dismissed';
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Suggestion[];
  timestamp: number;
}
```

- [ ] **Step 2: Verify build**

### Task 2: Ghost Note Utilities

**Files:**
- Create: `src/lib/ghost-notes.ts`

- [ ] **Step 1: Create helper functions**

```typescript
import { Composition } from '@/types/composition';
import { GhostNote } from '@/types/advisor';

/** Merge pending ghost notes into a composition clone for playback preview */
export function getPlayableComposition(comp: Composition, ghostNotes: GhostNote[]): Composition {
  const pending = ghostNotes.filter(g => g.status === 'pending');
  if (pending.length === 0) return comp;
  const merged: Composition = JSON.parse(JSON.stringify(comp));
  for (const ghost of pending) {
    const track = merged.tracks[ghost.trackIndex];
    if (!track) continue;
    if (track.instrument === 'drums' && track.pattern) {
      // Ghost drum hits not supported yet — skip
    } else if (track.notes) {
      track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
    }
  }
  return merged;
}

/** Generate a unique ID */
export function ghostId(): string {
  return 'g_' + Math.random().toString(36).slice(2, 10);
}

/** Generate a suggestion group ID */
export function suggestionId(): string {
  return 'sg_' + Math.random().toString(36).slice(2, 10);
}
```

- [ ] **Step 2: Verify build**

### Task 3: Store Additions — Ghost Notes + Highlights + Advisor State

**Files:**
- Modify: `src/store/use-store.ts`

- [ ] **Step 1: Import new types**

Add imports:
```typescript
import { GhostNote, NoteHighlight, AdvisorMessage, Suggestion } from '@/types/advisor';
import { getPlayableComposition } from '@/lib/ghost-notes';
```

- [ ] **Step 2: Add state to interface**

```typescript
// Advisor
ghostNotes: GhostNote[];
highlightedNotes: NoteHighlight[];
advisorOpen: boolean;
advisorMessages: AdvisorMessage[];
isAdvisorGenerating: boolean;
```

- [ ] **Step 3: Add default state values**

After the editor defaults:
```typescript
ghostNotes: [] as GhostNote[],
highlightedNotes: [] as NoteHighlight[],
advisorOpen: false,
advisorMessages: [] as AdvisorMessage[],
isAdvisorGenerating: false,
```

- [ ] **Step 4: Add action signatures to interface**

```typescript
// Advisor actions
toggleAdvisor: () => void;
clearAdvisor: () => void;
addGhostNotes: (notes: GhostNote[]) => void;
clearGhostNotes: () => void;
acceptGhostNote: (id: string) => void;
rejectGhostNote: (id: string) => void;
acceptGroup: (groupId: string) => void;
rejectGroup: (groupId: string) => void;
acceptAllGhosts: () => void;
rejectAllGhosts: () => void;
editGhostNote: (id: string, updates: Partial<GhostNote>) => void;
setHighlights: (highlights: NoteHighlight[]) => void;
clearHighlights: () => void;
applyRemoval: (highlights: NoteHighlight[]) => void;
askAdvisor: (question: string) => Promise<void>;
```

- [ ] **Step 5: Implement advisor UI actions**

```typescript
toggleAdvisor: () => set({ advisorOpen: !get().advisorOpen }),
clearAdvisor: () => set({ advisorMessages: [], ghostNotes: [], highlightedNotes: [], isAdvisorGenerating: false }),
```

- [ ] **Step 6: Implement ghost note actions**

```typescript
addGhostNotes: (notes) => {
  const current = get().ghostNotes;
  // Cap at 50 pending
  const pending = current.filter(g => g.status === 'pending');
  if (pending.length + notes.length > 50) return; // over cap
  set({ ghostNotes: [...current, ...notes] });
},

clearGhostNotes: () => set({ ghostNotes: [] }),

acceptGhostNote: (id) => {
  const ghost = get().ghostNotes.find(g => g.id === id);
  if (!ghost || ghost.status !== 'pending') return;
  const comp = get().composition;
  if (!comp) return;

  // Push undo
  const undoStack = [...get().undoStack, comp];

  // If it replaces an existing note, remove the original
  let newComp = { ...comp, tracks: [...comp.tracks] };
  if (ghost.replacesNote) {
    const ri = ghost.replacesNote;
    newComp.tracks = newComp.tracks.map((t, ti) => {
      if (ti !== ri.trackIndex) return t;
      return { ...t, notes: t.notes?.filter(n => !(n.time === ri.time && n.note === ri.note)) };
    });
  }

  // Add the ghost note as a real note
  newComp.tracks = newComp.tracks.map((t, ti) => {
    if (ti !== ghost.trackIndex) return t;
    return { ...t, notes: [...(t.notes || []), { note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity }] };
  });

  // Mark ghost as accepted
  const newGhosts = get().ghostNotes.map(g => g.id === id ? { ...g, status: 'accepted' as const } : g);

  set({ composition: newComp, undoStack, redoStack: [] as Composition[], ghostNotes: newGhosts });
},

rejectGhostNote: (id) => {
  set({ ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, status: 'rejected' as const } : g) });
},

acceptGroup: (groupId) => {
  const ghosts = get().ghostNotes.filter(g => g.groupId === groupId && g.status === 'pending');
  if (ghosts.length === 0) return;
  // Accept each ghost note (batch — one undo entry)
  const comp = get().composition;
  if (!comp) return;
  const undoStack = [...get().undoStack, comp];

  let newComp: Composition = JSON.parse(JSON.stringify(comp));
  for (const ghost of ghosts) {
    if (ghost.replacesNote) {
      const ri = ghost.replacesNote;
      const track = newComp.tracks[ri.trackIndex];
      if (track?.notes) track.notes = track.notes.filter(n => !(n.time === ri.time && n.note === ri.note));
    }
    const track = newComp.tracks[ghost.trackIndex];
    if (track?.notes) track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
  }

  const newGhosts = get().ghostNotes.map(g =>
    g.groupId === groupId && g.status === 'pending' ? { ...g, status: 'accepted' as const } : g
  );

  set({ composition: newComp, undoStack, redoStack: [] as Composition[], ghostNotes: newGhosts });
},

rejectGroup: (groupId) => {
  set({ ghostNotes: get().ghostNotes.map(g =>
    g.groupId === groupId && g.status === 'pending' ? { ...g, status: 'rejected' as const } : g
  )});
},

acceptAllGhosts: () => {
  const pending = get().ghostNotes.filter(g => g.status === 'pending');
  if (pending.length === 0) return;
  const groups = [...new Set(pending.map(g => g.groupId))];
  // Accept group by group uses the same logic
  for (const gid of groups) get().acceptGroup(gid);
},

rejectAllGhosts: () => {
  set({ ghostNotes: get().ghostNotes.map(g => g.status === 'pending' ? { ...g, status: 'rejected' as const } : g) });
},

editGhostNote: (id, updates) => {
  set({ ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, ...updates } : g) });
},
```

- [ ] **Step 7: Implement highlight actions**

```typescript
setHighlights: (highlights) => set({ highlightedNotes: highlights }),
clearHighlights: () => set({ highlightedNotes: [] }),

applyRemoval: (highlights) => {
  const comp = get().composition;
  if (!comp) return;
  const undoStack = [...get().undoStack, comp];
  let newComp: Composition = JSON.parse(JSON.stringify(comp));
  for (const h of highlights) {
    const track = newComp.tracks[h.trackIndex];
    if (!track) continue;
    if (h.note && track.notes) {
      track.notes = track.notes.filter(n => !(n.time === h.time && n.note === h.note));
    } else if (h.drum && track.pattern) {
      track.pattern = track.pattern.filter(p => !(p.time === h.time && p.drum === h.drum));
    }
  }
  set({ composition: newComp, undoStack, redoStack: [] as Composition[], highlightedNotes: [] });
},
```

- [ ] **Step 8: Modify play() to use getPlayableComposition**

Update the existing `play()`:
```typescript
play: async () => {
  if (get().isGenerating || get().isStreamingTracks) return;
  if (!get().audioReady) await get().initAudio();
  const comp = get().composition;
  if (!comp) return;
  const playable = getPlayableComposition(comp, get().ghostNotes);
  getEngine().play(playable);
  set({ isPlaying: true });
},
```

- [ ] **Step 9: Verify build**

---

## Chunk 2: API Endpoint + Advisor Prompt

### Task 4: Advisor System Prompt

**Files:**
- Create: `src/lib/advisor-prompt.ts`

- [ ] **Step 1: Create the advisor prompt**

A system prompt that instructs the LLM to be a music reviewer/advisor. It must:
- Analyze the composition's key, chord progression, rhythm, instrumentation
- Return structured JSON with suggestion groups matching the spec format
- Be constructive and beginner-friendly
- Max 3-4 suggestion groups per response
- Include specific note values (pitch, duration, time, velocity, trackIndex)

- [ ] **Step 2: Verify build**

### Task 5: API Endpoint

**Files:**
- Create: `src/app/api/advisor/route.ts`

- [ ] **Step 1: Create the endpoint**

Mirrors the existing `/api/generate/route.ts` pattern:
- POST handler
- Reads `composition`, `question`, `model` from body
- Uses `ADVISOR_PROMPT` as system message
- Sends composition as context
- SSE streams the response
- Two-phase: text streams live, suggestions parsed after stream completes (client-side)

- [ ] **Step 2: Verify build**

### Task 6: askAdvisor Store Action

**Files:**
- Modify: `src/store/use-store.ts`

- [ ] **Step 1: Implement askAdvisor**

```typescript
askAdvisor: async (question) => {
  if (get().isAdvisorGenerating || !get().composition) return;
  const msgId = 'am_' + Date.now();
  const userMsg: AdvisorMessage = { id: msgId, role: 'user', content: question, timestamp: Date.now() };

  set({
    advisorMessages: [...get().advisorMessages, userMsg],
    isAdvisorGenerating: true,
    highlightedNotes: [], // Clear old highlights
  });

  try {
    const response = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        composition: get().composition,
        question,
        model: get().model,
      }),
    });

    if (!response.ok) throw new Error('Advisor request failed');

    // Read SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE data lines
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) fullText += token;
        } catch {}
      }
    }

    // Parse the complete response — two-phase: extract message + suggestions
    let message = fullText;
    let suggestions: Suggestion[] = [];

    // Try to extract JSON block from the response
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/) || fullText.match(/(\{[\s\S]*"suggestions"[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (parsed.message) message = parsed.message;
        if (parsed.suggestions) suggestions = parsed.suggestions;
      } catch {}
    }

    // Process suggestions — create ghost notes and highlights
    const newGhosts: GhostNote[] = [];
    const newHighlights: NoteHighlight[] = [];

    for (const sg of suggestions) {
      sg.id = sg.id || suggestionId();
      sg.status = 'pending';

      if (sg.ghostNotes) {
        for (const gn of sg.ghostNotes) {
          gn.id = ghostId();
          gn.groupId = sg.id;
          gn.status = 'pending';
          newGhosts.push(gn);
        }
      }
      if (sg.highlights) {
        newHighlights.push(...sg.highlights);
      }
    }

    const assistantMsg: AdvisorMessage = {
      id: 'am_' + Date.now(),
      role: 'assistant',
      content: message,
      suggestions,
      timestamp: Date.now(),
    };

    set({
      advisorMessages: [...get().advisorMessages, assistantMsg],
      ghostNotes: [...get().ghostNotes, ...newGhosts],
      highlightedNotes: newHighlights,
      isAdvisorGenerating: false,
    });
  } catch (err) {
    set({ isAdvisorGenerating: false });
  }
},
```

(Import `ghostId`, `suggestionId` from `ghost-notes.ts` and `GhostNote`, `Suggestion`, `NoteHighlight`, `AdvisorMessage` from `types/advisor.ts`)

- [ ] **Step 2: Verify build**

---

## Chunk 3: UI Components

### Task 7: SuggestionCard Component

**Files:**
- Create: `src/components/SuggestionCard.tsx`

- [ ] **Step 1: Create the component**

Renders a single suggestion card with:
- Title + type icon (add=green, remove=red, modify=yellow, highlight=blue)
- Description text
- Note pills for each ghost note (clickable to accept/reject individually)
- "Accept Group" / "Reject Group" buttons
- For `remove` type: "Apply Removal" button
- Dimmed appearance when status is 'applied' or 'dismissed'

All actions call the corresponding store methods.

- [ ] **Step 2: Verify build**

### Task 8: AIAdvisor Panel Component

**Files:**
- Create: `src/components/AIAdvisor.tsx`

- [ ] **Step 1: Create the panel**

Renders:
- Header: "AI Advisor" title + collapse button + "Clear" button
- Scrollable cards area showing `advisorMessages` — user messages as text, assistant messages with suggestion cards
- Global "Accept All" / "Reject All" sticky bar (visible when pending ghosts exist)
- Input bar at bottom: text input + send button, disabled during `isAdvisorGenerating`

Width: `min(300px, 28vw)`. Collapsible to 0px.

- [ ] **Step 2: Verify build**

### Task 9: Integration — BeatEditor + Toolbar

**Files:**
- Modify: `src/components/BeatEditor.tsx`
- Modify: `src/components/EditorToolbar.tsx`

- [ ] **Step 1: Add AI toggle to toolbar**

Add a sparkle icon button to EditorToolbar that calls `toggleAdvisor()`. Highlighted when `advisorOpen` is true.

- [ ] **Step 2: Render AIAdvisor in BeatEditor**

In the flex layout, after `<EditorGrid />`:
```tsx
{advisorOpen && <AIAdvisor />}
```

- [ ] **Step 3: Verify build**

### Task 10: EditorGrid — Ghost Notes + Highlights

**Files:**
- Modify: `src/components/EditorGrid.tsx`

- [ ] **Step 1: Render ghost notes on the grid**

For each track row, after rendering real notes, render ghost notes that match `trackIndex`:
- Semi-transparent (opacity 0.35)
- Dashed border (CSS: `border: 2px dashed`)
- Small "✨" indicator
- Clickable — opens NotePopup for editing (same as real notes but styled differently)
- In eraser mode, clicking deletes the ghost note

Ghost notes from the store: `ghostNotes.filter(g => g.trackIndex === trackIndex && g.status === 'pending')`

- [ ] **Step 2: Render highlights on existing notes**

For each real note, check if there's a matching highlight in `highlightedNotes` (by trackIndex + time + note/drum). If so, add a colored border:
- yellow: `border: 2px solid #e8c06c`
- red: `border: 2px solid #e85a5a`
- green: `border: 2px solid #5ac87a`

- [ ] **Step 3: Verify build — full flow**

Test:
1. Open editor → click AI toggle → advisor panel opens
2. Type "what should I add?" → suggestions appear as cards
3. Ghost notes appear on grid (semi-transparent, dashed)
4. Click "Accept Group" → ghost notes become real
5. Click "Reject Group" → ghost notes disappear
6. Close editor → play music → ghost notes are audible

- [ ] **Step 4: Final build verification**

Run: `npx next build` — must pass with zero errors.

---

## Execution Notes

- **Advisor prompt** should be thorough but concise. Include the exact JSON schema the AI must return. Include examples of each suggestion type.
- **Ghost note CSS** — add to globals.css: `.ghost-note { opacity: 0.35; border: 2px dashed; animation: ghostShimmer 2s ease-in-out infinite; }`
- **The store is already large (~1100 lines).** The advisor actions add ~150 lines. This is acceptable — the store follows Zustand's flat pattern and splitting would add complexity for no benefit.
- **Do NOT modify Timeline.tsx** — ghost notes only appear in the editor grid.
- **Do NOT modify the audio engine** — `getPlayableComposition()` handles merging at the store level.
