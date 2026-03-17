# BrewBeats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a music creation app where users type prompts, NVIDIA NIM LLM generates structured compositions, and Tone.js synthesizes real audio with visual editing and mixing.

**Architecture:** Next.js App Router frontend with API route proxying to NVIDIA NIM. Tone.js audio engine synthesizes music from JSON compositions. Zustand manages all state (composition, chat, mixer, transport).

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tone.js, Tailwind CSS, Zustand

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.env.local`, `.gitignore`

**Step 1: Initialize Next.js project**

```bash
cd "C:/Users/dnaco/OneDrive/Documents/project/Music Pormpter"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**Step 2: Install dependencies**

```bash
npm install tone zustand
npm install -D @types/node
```

**Step 3: Create .env.local**

```
NVIDIA_API_KEY=your_nvidia_nim_api_key_here
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
```

**Step 4: Set up globals.css with dusk coffee palette**

Replace default Tailwind globals with custom coffee theme CSS variables.

**Step 5: Configure tailwind.config.ts with custom colors**

Add espresso, roast, caramel, cream, dusk, warmWhite to theme.

---

### Task 2: Type Definitions & Composition Schema

**Files:**
- Create: `src/types/composition.ts`
- Create: `src/types/chat.ts`

**Step 1: Define composition types**

```typescript
// Composition JSON schema matching what LLM returns
interface Note { note: string; duration: string; time: string; velocity?: number; }
interface DrumHit { drum: string; time: string; velocity?: number; }
interface Track { instrument: string; volume: number; muted: boolean; solo: boolean; notes?: Note[]; pattern?: DrumHit[]; }
interface Composition { title: string; bpm: number; key: string; timeSignature: string; tracks: Track[]; measures: number; }
```

**Step 2: Define chat types**

```typescript
interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
```

---

### Task 3: NVIDIA NIM API Route

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `src/lib/system-prompt.ts`

**Step 1: Write the system prompt**

The system prompt instructs the LLM to return valid JSON compositions with specific instrument names, note formats (Tone.js compatible), and musical structure. It must understand music theory and return compositions that sound good.

**Step 2: Write the API route**

```typescript
// POST /api/generate
// Receives: { messages: ChatMessage[] }
// Returns: { composition: Composition, message: string }
// Calls: https://integrate.api.nvidia.com/v1/chat/completions
```

The route:
1. Receives chat history + new user prompt
2. Prepends system prompt with composition format instructions
3. Calls NVIDIA NIM LLM
4. Parses JSON composition from response
5. Returns both the composition and the LLM's conversational text

---

### Task 4: Instrument Registry & Audio Engine

**Files:**
- Create: `src/lib/audio/instrument-registry.ts`
- Create: `src/lib/audio/engine.ts`

**Step 1: Create instrument registry**

Each instrument entry:
- name, type, create function (returns Tone.js instrument)
- Piano: PolySynth(Synth) with piano-like envelope
- Guitar: PolySynth(FMSynth) with plucky settings
- Bass: MonoSynth with deep settings
- Drums: MembraneSynth (kick), MetalSynth (hihat), NoiseSynth (snare)
- Synth Pad: PolySynth(AMSynth) with slow attack

**Step 2: Create audio engine**

The engine class:
- loadComposition(comp: Composition): creates instruments, schedules all notes via Tone.Part
- play() / pause() / stop(): transport controls
- setTempo(bpm): adjust BPM
- setTrackVolume(instrument, vol): per-track volume
- muteTrack / soloTrack
- dispose(): cleanup
- exportWav(): render to WAV using Tone.Offline

---

### Task 5: Zustand Store

**Files:**
- Create: `src/store/use-store.ts`

**Step 1: Create unified store**

```typescript
interface BrewBeatsState {
  // Composition
  composition: Composition | null;
  isGenerating: boolean;

  // Chat
  messages: ChatMessage[];

  // Transport
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;

  // Mixer
  trackVolumes: Record<string, number>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;

  // Actions
  generate: (prompt: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setTrackVolume: (track: string, vol: number) => void;
  toggleMute: (track: string) => void;
  toggleSolo: (track: string) => void;
  updateNote: (trackIndex: number, noteIndex: number, updates: Partial<Note>) => void;
  addNote: (trackIndex: number, note: Note) => void;
  removeNote: (trackIndex: number, noteIndex: number) => void;
}
```

---

### Task 6: UI - Layout & Chat Panel

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/ChatPanel.tsx`
- Create: `src/components/PromptInput.tsx`

**Step 1: Build Layout component**

Three-section layout: left (chat), right (timeline), bottom (mixer).
Dark coffee theme. BrewBeats logo/title top-left.

**Step 2: Build ChatPanel**

Scrollable message list. User messages vs AI responses styled differently.
Shows composition status (generating, ready, error).

**Step 3: Build PromptInput**

Text input with send button. Handles Enter to submit.
Shows loading state while generating.

---

### Task 7: UI - Visual Timeline Grid

**Files:**
- Create: `src/components/Timeline.tsx`
- Create: `src/components/TrackRow.tsx`
- Create: `src/components/NoteBlock.tsx`

**Step 1: Build Timeline**

Grid with instrument tracks as rows, time divisions as columns.
Horizontal scrolling. Beat markers at top. Playhead indicator.

**Step 2: Build TrackRow**

One row per instrument. Shows instrument name + icon on left.
Note blocks positioned by time, width by duration.

**Step 3: Build NoteBlock**

Clickable/draggable blocks on the grid.
Click empty cell = add note. Click note = remove note.
Color-coded by instrument.

---

### Task 8: UI - Mixer Panel & Transport Controls

**Files:**
- Create: `src/components/Mixer.tsx`
- Create: `src/components/TrackChannel.tsx`
- Create: `src/components/Transport.tsx`

**Step 1: Build Mixer**

Horizontal strip at bottom. One channel per instrument.

**Step 2: Build TrackChannel**

Vertical fader (volume slider), Mute button [M], Solo button [S].
Instrument name label. Volume dB display.

**Step 3: Build Transport**

Play/Pause, Stop buttons. BPM display with +/- controls.
Loop toggle. Current position display. Export WAV button.

---

### Task 9: Integration & Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Wire everything together**

Main page composes Layout > ChatPanel + Timeline + Mixer + Transport.
Connect Zustand store to all components.
Initialize audio engine on first user interaction (browser audio policy).

**Step 2: Handle the generation flow**

1. User types prompt → store.generate() called
2. API route called with message history
3. Response parsed → composition stored
4. Audio engine loads composition
5. Timeline and mixer update reactively

---

### Task 10: Export & Polish

**Files:**
- Create: `src/lib/audio/export.ts`
- Modify: various components for polish

**Step 1: WAV export**

Use Tone.Offline to render composition to AudioBuffer.
Convert to WAV format. Trigger browser download.

**Step 2: Settings panel**

API key input (for users without env var).
Model selection dropdown.

**Step 3: Polish**

Loading states, error handling, responsive layout.
Keyboard shortcuts (Space = play/pause).
