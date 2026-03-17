import { create } from 'zustand';
import { Composition, Note, Track, DrumHit } from '@/types/composition';
import { GhostNote, GhostInstrument, NoteHighlight, AdvisorMessage, Suggestion, LockedRejection } from '@/types/advisor';
import { getPlayableComposition, ghostId, suggestionId } from '@/lib/ghost-notes';
import { ChatMessage } from '@/types/chat';
import { SessionMeta } from '@/types/session';
import { getEngine } from '@/lib/audio/engine';
import * as storage from '@/lib/session-storage';
import {
  stripThinkingTags,
  stripJsonFromText,
  parseResponse,
  extractStreamingComposition,
  parsePatch,
  applyPatch,
} from '@/lib/json-parser';

interface BrewBeatsState {
  // Landing
  showLanding: boolean;

  // Composition
  composition: Composition | null;
  isGenerating: boolean;

  // Chat
  messages: ChatMessage[];

  // Transport
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  swing: number;

  // Mixer
  trackVolumes: Record<string, number>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;

  // Settings
  apiKey: string;
  model: string;
  showSettings: boolean;

  // Audio initialized
  audioReady: boolean;

  // Undo/Redo
  undoStack: Composition[];
  redoStack: Composition[];

  // Streaming reveal — tracks appear one by one
  revealedTracks: number[];
  isStreamingTracks: boolean;
  lastAddedNoteTime: string | null;

  // Sessions
  currentSessionId: string | null;
  sessionList: SessionMeta[];

  // Editor
  editorOpen: boolean;
  selectedTrackIndex: number | null;
  editorTool: 'pencil' | 'eraser' | 'select';
  editorSnap: '4n' | '8n' | '16n';

  // Advisor
  ghostNotes: GhostNote[];
  ghostInstruments: GhostInstrument[];
  highlightedNotes: NoteHighlight[];
  lockedRejections: LockedRejection[];
  rejectionCount: number;
  advisorOpen: boolean;
  advisorMessages: AdvisorMessage[];
  isAdvisorGenerating: boolean;
  ghostOnlyView: boolean;

  // Actions
  enterApp: () => void;
  goToLanding: () => void;
  initAudio: () => Promise<void>;
  generate: (prompt: string) => Promise<void>;
  loadComposition: (comp: Composition, stream?: boolean) => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => Promise<void>;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setCurrentBeat: (beat: number) => void;
  setTrackVolume: (track: string, vol: number) => void;
  toggleMute: (track: string) => void;
  toggleSolo: (track: string) => void;
  setTrackEffect: (track: string, effect: 'reverb' | 'delay', value: number) => void;
  updateNote: (trackIndex: number, noteIndex: number, updates: Partial<Note>) => void;
  addNote: (trackIndex: number, note: Note) => void;
  removeNote: (trackIndex: number, noteIndex: number) => void;
  undo: () => void;
  redo: () => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  toggleSettings: () => void;
  exportWav: () => Promise<void>;

  // Advisor actions
  toggleAdvisor: () => void;
  toggleGhostOnlyView: () => void;
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
  lockRejection: (id: string) => void; // permanently reject — AI won't re-suggest
  setHighlights: (highlights: NoteHighlight[]) => void;
  clearHighlights: () => void;
  applyRemoval: (highlights: NoteHighlight[]) => void;
  askAdvisor: (question: string) => Promise<void>;

  // Editor actions
  openEditor: () => void;
  closeEditor: () => void;
  setSelectedTrack: (index: number | null) => void;
  setEditorTool: (tool: 'pencil' | 'eraser' | 'select') => void;
  setEditorSnap: (snap: '4n' | '8n' | '16n') => void;
  addTrack: (instrument: string) => void;
  deleteTrack: (trackIndex: number) => void;
  duplicateTrack: (trackIndex: number) => void;
  clearTrack: (trackIndex: number) => void;
  moveNote: (trackIndex: number, noteIndex: number, newTime: string) => void;
  resizeNote: (trackIndex: number, noteIndex: number, newDuration: string) => void;
  addDrumHit: (trackIndex: number, hit: DrumHit) => void;
  removeDrumHit: (trackIndex: number, hitIndex: number) => void;
  removeNotes: (removals: { trackIndex: number; noteIndex: number }[]) => void;
  moveNotes: (moves: { trackIndex: number; noteIndex: number; newTime: string }[]) => void;
  addMeasure: () => void;
  removeMeasure: () => void;

  // Session actions
  createSession: (name?: string) => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  saveCurrentSession: () => void;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Build mixer state from tracks */
function initMixerState(tracks: { instrument: string; volume: number; muted: boolean; solo: boolean }[]) {
  const trackVolumes: Record<string, number> = {};
  const trackMutes: Record<string, boolean> = {};
  const trackSolos: Record<string, boolean> = {};
  tracks.forEach((t) => {
    trackVolumes[t.instrument] = t.volume;
    trackMutes[t.instrument] = t.muted;
    trackSolos[t.instrument] = t.solo;
  });
  return { trackVolumes, trackMutes, trackSolos };
}

/** All track indices [0, 1, 2, ...] */
function allTrackIndices(tracks: unknown[]): number[] {
  return tracks.map((_, i) => i);
}

/** Stagger-reveal track indices with timers */
function staggerReveal(
  indices: number[],
  set: (fn: (s: { revealedTracks: number[]; isStreamingTracks: boolean }) => Partial<{ revealedTracks: number[]; isStreamingTracks: boolean }>) => void,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  indices.forEach((idx, j) => {
    timers.push(setTimeout(() => {
      set(s => ({
        revealedTracks: [...s.revealedTracks, idx],
        isStreamingTracks: j < indices.length - 1,
      }));
    }, 100 + j * 150));
  });
  return () => { timers.forEach(clearTimeout); };
}

// Cleanup function for streaming track reveal timers
let streamTimerCleanup: (() => void) | null = null;

/** Find the latest note/pattern time across an array of tracks */
function findLatestTime(tracks: Composition['tracks'], fallback: string | null): string | null {
  let latest = fallback;
  for (const t of tracks) {
    const lastN = t.notes?.[t.notes.length - 1];
    if (lastN?.time && (!latest || lastN.time > latest)) latest = lastN.time;
    const lastP = t.pattern?.[t.pattern.length - 1];
    if (lastP?.time && (!latest || lastP.time > latest)) latest = lastP.time;
  }
  return latest;
}

/** Filter out tracks with no notes and no pattern */
function filterEmptyTracks(tracks: Composition['tracks']): Composition['tracks'] {
  return tracks.filter(t =>
    (t.notes && t.notes.length > 0) || (t.pattern && t.pattern.length > 0)
  );
}

/** Count total notes + pattern hits across tracks */
function countNotes(tracks: Composition['tracks']): number {
  return tracks.reduce((sum, t) => sum + (t.notes?.length || 0) + (t.pattern?.length || 0), 0);
}

/** Default state for a fresh session (shared by enterApp and createSession) */
const FRESH_SESSION_STATE = {
  composition: null as Composition | null,
  messages: [] as ChatMessage[],
  undoStack: [] as Composition[],
  redoStack: [] as Composition[],
  trackVolumes: {} as Record<string, number>,
  trackMutes: {} as Record<string, boolean>,
  trackSolos: {} as Record<string, boolean>,
  bpm: 90,
  swing: 0,
  isPlaying: false,
  currentBeat: 0,
  revealedTracks: [] as number[],
  isStreamingTracks: false,
};

/** Create and persist a fresh session, returning the id */
function createFreshSession(name: string): string {
  const id = genId();
  const now = Date.now();
  storage.saveSession({
    id,
    name,
    composition: null,
    messages: [],
    undoStack: [],
    redoStack: [],
    trackVolumes: {},
    trackMutes: {},
    trackSolos: {},
    bpm: 90,
    swing: 0,
    createdAt: now,
    updatedAt: now,
  });
  storage.setActiveSessionId(id);
  return id;
}

// Auto-rename session using AI in the background
async function autoRenameSession(
  sessionId: string,
  userPrompt: string,
  composition: Composition,
  model: string,
) {
  const fallbackName = composition.title && composition.title !== 'Untitled Beat' ? composition.title : null;
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `Name this beat. Rules: 2-4 words, creative, evocative, NO quotes, NO punctuation, NO generic words like "beat" "track" "session" "untitled". Think album track names, vibes, imagery, moods, places, moments.

Genre clues: ${composition.bpm} BPM, key of ${composition.key}, instruments: ${composition.tracks.map(t => t.instrument).join(', ')}.
User's request: "${userPrompt}"

Examples of GOOD names: Midnight Velvet, Neon Rainfall, Amber Coastline, Frozen Cathedral, Tokyo Haze, Copper Sunrise, Phantom Groove, Silk Thunder, Ocean Archive, Violet Machinery

Reply with ONLY the name. Nothing else.`,
          },
        ],
      }),
    });

    // Response is SSE stream — read all content tokens
    let nameText = '';
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            nameText += p.choices?.[0]?.delta?.content || '';
          } catch {}
        }
      }
    } else {
      const data = await res.json();
      nameText = data.message || '';
    }

    const name = stripThinkingTags(nameText)
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[{}\[\]"]/g, '')
      .trim()
      .split('\n')[0]
      .trim();

    if (name && name.length > 0 && name.length <= 50) {
      useStore.getState().renameSession(sessionId, name);
    } else if (fallbackName) {
      useStore.getState().renameSession(sessionId, fallbackName);
    }
  } catch {
    if (fallbackName) {
      useStore.getState().renameSession(sessionId, fallbackName);
    }
  }
}

// Load persisted settings from localStorage
function loadPersisted() {
  if (typeof window === 'undefined') return {};
  try {
    const DEFAULT_MODEL = 'meta/llama-4-maverick-17b-128e-instruct';
    const savedModel = localStorage.getItem('brewbeats-model');
    const model = (!savedModel || savedModel === 'qwen/qwen3.5-122b-a10b') ? DEFAULT_MODEL : savedModel;
    return {
      showLanding: true,
      model,
      sessionList: storage.getSessionList(),
    };
  } catch {
    return {};
  }
}

/** Clone composition with a modified track */
function cloneCompWithTrack(
  comp: Composition,
  trackIndex: number,
  modify: (track: Composition['tracks'][0]) => Composition['tracks'][0],
): Composition {
  const newComp = { ...comp };
  newComp.tracks = [...newComp.tracks];
  newComp.tracks[trackIndex] = modify({ ...newComp.tracks[trackIndex] });
  return newComp;
}

/** Save generation result to a different session (user switched during generation) */
function saveToOriginalSession(
  originSessionId: string,
  comp: Composition | null,
  set: (partial: Partial<BrewBeatsState>) => void,
) {
  if (comp && originSessionId) {
    const origSession = storage.loadSession(originSessionId);
    if (origSession) {
      origSession.composition = comp;
      origSession.updatedAt = Date.now();
      storage.saveSession(origSession);
      set({ sessionList: storage.getSessionList() });
    }
  }
}

/** Auto-rename if session is still "Untitled Session" */
function tryAutoRename(get: () => BrewBeatsState, prompt: string, comp: Composition) {
  const s = get();
  const meta = s.sessionList.find(m => m.id === s.currentSessionId);
  if (meta && meta.name === 'Untitled Session') {
    autoRenameSession(meta.id, prompt, comp, s.model);
  }
}

export const useStore = create<BrewBeatsState>((set, get) => ({
  showLanding: true,
  composition: null,
  isGenerating: false,
  messages: [],
  isPlaying: false,
  bpm: 90,
  currentBeat: 0,
  swing: 0,
  trackVolumes: {},
  trackMutes: {},
  trackSolos: {},
  apiKey: '',
  model: 'meta/llama-4-maverick-17b-128e-instruct',
  showSettings: false,
  audioReady: false,
  undoStack: [],
  redoStack: [],
  revealedTracks: [],
  isStreamingTracks: false,
  lastAddedNoteTime: null,
  currentSessionId: null,
  sessionList: [],
  editorOpen: false,
  selectedTrackIndex: null,
  editorTool: 'pencil' as const,
  editorSnap: '16n' as const,
  ghostNotes: [] as GhostNote[],
  ghostInstruments: [] as GhostInstrument[],
  highlightedNotes: [] as NoteHighlight[],
  lockedRejections: [] as LockedRejection[],
  rejectionCount: 0,
  advisorOpen: false,
  advisorMessages: [] as AdvisorMessage[],
  isAdvisorGenerating: false,
  ghostOnlyView: false,
  ...loadPersisted(),

  enterApp: () => {
    // Save previous session to history, then start fresh
    const lastId = storage.getActiveSessionId?.();
    if (lastId) {
      // Previous session is already saved in storage — just make sure it's persisted
      try { get().saveCurrentSession(); } catch {}
    }
    // Always create a fresh session
    const id = createFreshSession('Untitled Session');
    set({
      showLanding: false,
      currentSessionId: id,
      ...FRESH_SESSION_STATE,
      sessionList: storage.getSessionList(),
    });
  },

  goToLanding: () => {
    if (streamTimerCleanup) { streamTimerCleanup(); streamTimerCleanup = null; }
    get().saveCurrentSession();
    getEngine().stop();
    set({ showLanding: true, isPlaying: false, currentBeat: 0, isStreamingTracks: false });
  },

  initAudio: async () => {
    const engine = getEngine();
    await engine.init();
    engine.setOnBeat((beat) => set({ currentBeat: beat }));
    set({ audioReady: true });
  },

  generate: async (prompt: string) => {
    const state = get();
    const originSessionId = state.currentSessionId;
    const preStreamComp = state.composition;

    // Background Compaction: compact history before it gets too large
    if (state.messages.length >= 18) {
      const firstMsgs = state.messages.slice(0, 2);
      const lastMsgs = state.messages.slice(-4);
      const summaryMsg: ChatMessage = {
        id: 'summary-' + Date.now(),
        role: 'system',
        content: '[History compacted to preserve context window]',
        timestamp: Date.now(),
      };
      set({ messages: [...firstMsgs, summaryMsg, ...lastMsgs] });
    }

    // Stop playback before generating to prevent audio corruption
    if (state.isPlaying) {
      getEngine().stop();
      set({ isPlaying: false, currentBeat: 0 });
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    set({
      messages: [...state.messages, userMessage],
      isGenerating: true,
      editorOpen: false, // Close editor during generation
    });

    const isSameSession = () => get().currentSessionId === originSessionId;

    try {
      const apiMessages = get().messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          currentComposition: state.composition || undefined,
          model: state.model,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        // ═══ REAL-TIME STREAMING ═══
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let lastParseTime = 0;
        let prevNoteCount = 0;
        let lastStreamedComp: Composition | null = null;
        let isPatchStream = false;

        /** Update streaming composition state. Returns true if UI was updated. */
        const tryIncrementalParse = (): boolean => {
          if (!isSameSession()) return false;

          if (!isPatchStream && preStreamComp && fullText.includes('"_patch"')) {
            isPatchStream = true;
          }

          const streamedComp = extractStreamingComposition(fullText);

          // Determine the tracks to display
          let displayTracks: Composition['tracks'];
          let baseComp: Composition;

          if (isPatchStream && preStreamComp) {
            const baseInstruments = new Set(preStreamComp.tracks.map(t => t.instrument));
            const newTracks = filterEmptyTracks(
              streamedComp?.tracks.filter(t => !baseInstruments.has(t.instrument)) || []
            );
            displayTracks = [...preStreamComp.tracks, ...newTracks];
            baseComp = { ...preStreamComp, tracks: displayTracks };
          } else {
            if (!streamedComp) return false;
            displayTracks = filterEmptyTracks(streamedComp.tracks);
            baseComp = { ...streamedComp, tracks: displayTracks };
          }

          const newNoteCount = countNotes(displayTracks);
          const curTrackCount = get().composition?.tracks.length || 0;

          if (newNoteCount <= prevNoteCount && displayTracks.length === curTrackCount) {
            return false;
          }

          const latestTime = findLatestTime(
            isPatchStream && preStreamComp
              ? displayTracks.slice(preStreamComp.tracks.length) // only new tracks for patches
              : displayTracks,
            get().lastAddedNoteTime,
          );

          prevNoteCount = newNoteCount;
          lastStreamedComp = baseComp;

          // Merge mixer state (keep existing, add new)
          const existing = { trackVolumes: get().trackVolumes, trackMutes: get().trackMutes, trackSolos: get().trackSolos };
          const added = initMixerState(displayTracks);
          set({
            composition: baseComp,
            bpm: baseComp.bpm,
            swing: baseComp.swing || 0,
            trackVolumes: { ...existing.trackVolumes, ...added.trackVolumes },
            trackMutes: { ...existing.trackMutes, ...added.trackMutes },
            trackSolos: { ...existing.trackSolos, ...added.trackSolos },
            revealedTracks: allTrackIndices(displayTracks),
            isStreamingTracks: true,
            lastAddedNoteTime: latestTime,
          });
          return true;
        };

        const yieldForRender = () => new Promise<void>(r => setTimeout(r, 0));

        // Read SSE stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          let hasClosingBrace = false;

          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                fullText += token;
                if (token.includes('}')) hasClosingBrace = true;
              }
            } catch { /* skip malformed chunk */ }
          }

          // Parse when a potential note object completes, throttled to 40ms
          const now = Date.now();
          if (hasClosingBrace && now - lastParseTime > 40) {
            lastParseTime = now;
            if (tryIncrementalParse()) await yieldForRender();
          }
        }

        // Final parse after stream ends
        tryIncrementalParse();

        const stripped = stripThinkingTags(fullText);

        // Parse final composition (patch or full)
        let finalComp: Composition | null = null;
        let textMessage = '';
        const patch = parsePatch(stripped);
        if (patch && preStreamComp) {
          finalComp = applyPatch(preStreamComp, patch);
          if (finalComp) {
            finalComp = { ...finalComp, tracks: filterEmptyTracks(finalComp.tracks) };
          }
          textMessage = stripJsonFromText(stripped.replace(/\{[\s\S]*"_patch"[\s\S]*\}/g, ''));
        } else {
          const parsed = parseResponse(stripped);
          finalComp = parsed.composition;
          textMessage = parsed.textMessage;
        }

        // Fallback: use last streamed comp if final parse failed
        if (!finalComp && lastStreamedComp) {
          finalComp = lastStreamedComp;
          textMessage = stripJsonFromText(stripped);
        }

        const cleanMsg = stripJsonFromText(textMessage);

        if (!isSameSession()) {
          saveToOriginalSession(originSessionId!, finalComp, set);
          set({ isGenerating: false, isStreamingTracks: false });
          return;
        }

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanMsg || (finalComp ? "Here's your composition!" : 'Something went wrong.'),
          timestamp: Date.now(),
          composition: finalComp || undefined,
        };

        set((s) => ({
          messages: [...s.messages, aiMessage],
          isGenerating: false,
        }));

        if (finalComp) {
          if (streamTimerCleanup) streamTimerCleanup();

          const undoStack = preStreamComp
            ? [...get().undoStack, preStreamComp]
            : get().undoStack;

          const mixer = initMixerState(finalComp.tracks);
          getEngine().loadComposition(finalComp);

          // Determine if we should animate new tracks (patch added tracks)
          const existingInstruments = preStreamComp ? new Set(preStreamComp.tracks.map(t => t.instrument)) : new Set<string>();
          const isPatchResult = patch !== null && preStreamComp !== null;
          const hasNewTracks = isPatchResult && finalComp.tracks.some(t => !existingInstruments.has(t.instrument));

          if (hasNewTracks) {
            const existingRevealed = finalComp.tracks
              .map((t, i) => existingInstruments.has(t.instrument) ? i : -1)
              .filter(i => i >= 0);
            const newIndices = finalComp.tracks
              .map((t, i) => existingInstruments.has(t.instrument) ? -1 : i)
              .filter(i => i >= 0);

            set({
              composition: finalComp, bpm: finalComp.bpm, swing: finalComp.swing || 0,
              ...mixer, undoStack, redoStack: [],
              revealedTracks: existingRevealed, isStreamingTracks: true,
              isPlaying: false, currentBeat: 0,
            });

            if (streamTimerCleanup) streamTimerCleanup();
            streamTimerCleanup = staggerReveal(newIndices, set);
          } else {
            set({
              composition: finalComp, bpm: finalComp.bpm, swing: finalComp.swing || 0,
              ...mixer, undoStack, redoStack: [],
              revealedTracks: allTrackIndices(finalComp.tracks), isStreamingTracks: false,
              isPlaying: false, currentBeat: 0,
            });
          }

          tryAutoRename(get, prompt, finalComp);
        } else {
          set({ isStreamingTracks: false });
        }

        get().saveCurrentSession();

      } else {
        // ═══ FALLBACK: Non-streaming JSON response ═══
        const data = await response.json();

        if (!isSameSession()) {
          saveToOriginalSession(originSessionId!, data.composition, set);
          set({ isGenerating: false });
          return;
        }

        let msgContent = stripJsonFromText(data.message || data.error || 'Something went wrong.');
        if (!msgContent) {
          msgContent = data.composition ? "Here's your composition!" : 'Something went wrong.';
        }

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: msgContent,
          timestamp: Date.now(),
          composition: data.composition || undefined,
        };

        set((s) => ({
          messages: [...s.messages, aiMessage],
          isGenerating: false,
        }));

        if (data.composition) {
          get().loadComposition(data.composition, true);
          tryAutoRename(get, prompt, data.composition);
        }

        get().saveCurrentSession();
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate'}`,
        timestamp: Date.now(),
      };
      set((s) => ({
        messages: [...s.messages, errorMessage],
        isGenerating: false,
        isStreamingTracks: false,
      }));
    }
  },

  loadComposition: (comp: Composition, stream = false) => {
    const state = get();
    const engine = getEngine();

    // Close editor when loading a new composition from AI generation (not from editor edits)
    if (state.editorOpen && state.isGenerating) set({ editorOpen: false });

    // Ensure drums track is always first
    const drumsIdx = comp.tracks.findIndex(t => t.instrument === 'drums');
    if (drumsIdx > 0) {
      const sorted = [...comp.tracks];
      const [drums] = sorted.splice(drumsIdx, 1);
      sorted.unshift(drums);
      comp = { ...comp, tracks: sorted };
    }

    const undoStack = state.composition
      ? [...state.undoStack, state.composition]
      : state.undoStack;

    const mixer = initMixerState(comp.tracks);
    engine.stop();

    const oldFingerprint = state.composition?.tracks.map(t => t.instrument).join('|') || '';
    const newFingerprint = comp.tracks.map(t => t.instrument).join('|');
    const tracksChanged = oldFingerprint !== newFingerprint;

    const base = {
      composition: comp,
      bpm: comp.bpm,
      swing: comp.swing || 0,
      ...mixer,
      isPlaying: false,
      currentBeat: 0,
      undoStack,
      redoStack: [] as Composition[],
    };

    if (stream && tracksChanged) {
      if (streamTimerCleanup) streamTimerCleanup();
      set({ ...base, revealedTracks: [], isStreamingTracks: true });
      streamTimerCleanup = staggerReveal(allTrackIndices(comp.tracks), set);
    } else {
      set({ ...base, revealedTracks: allTrackIndices(comp.tracks), isStreamingTracks: false });
    }

    engine.loadComposition(comp);
  },

  play: async () => {
    if (get().isGenerating || get().isStreamingTracks) return;
    if (!get().audioReady) await get().initAudio();
    const comp = get().composition;
    if (!comp) return;
    // Always build the playable composition (includes ghost notes if any)
    const playable = getPlayableComposition(comp, get().ghostNotes, get().ghostInstruments, get().ghostOnlyView);
    getEngine().play(playable);
    set({ isPlaying: true });
  },

  pause: () => {
    getEngine().pause();
    set({ isPlaying: false });
  },

  stop: () => {
    getEngine().stop();
    getEngine().markDirty(); // Force reload on next play
    set({ isPlaying: false, currentBeat: 0 });
  },

  togglePlayPause: async () => {
    if (get().isGenerating || get().isStreamingTracks) return;
    if (get().isPlaying) get().pause();
    else await get().play();
  },

  setBpm: (bpm: number) => {
    getEngine().setBpm(bpm);
    set({ bpm });
  },

  setSwing: (swing: number) => {
    getEngine().setSwing(swing);
    set({ swing });
  },

  setCurrentBeat: (beat: number) => set({ currentBeat: beat }),

  setTrackVolume: (track: string, vol: number) => {
    getEngine().setTrackVolume(track, vol);
    set((s) => ({ trackVolumes: { ...s.trackVolumes, [track]: vol } }));
  },

  toggleMute: (track: string) => {
    const newMuted = !get().trackMutes[track];
    getEngine().setTrackMute(track, newMuted);
    set((s) => ({ trackMutes: { ...s.trackMutes, [track]: newMuted } }));
  },

  toggleSolo: (track: string) => {
    const state = get();
    const newSolo = !state.trackSolos[track];
    const newSolos: Record<string, boolean> = {};
    Object.keys(state.trackSolos).forEach((k) => {
      newSolos[k] = k === track ? newSolo : false;
    });
    getEngine().setTrackSolo(track, newSolo);
    set({ trackSolos: newSolos });
  },

  setTrackEffect: (track: string, effect: 'reverb' | 'delay', value: number) => {
    getEngine().setTrackEffect(track, effect, value);
  },

  updateNote: (trackIndex: number, noteIndex: number, updates: Partial<Note>) => {
    if (!get().composition) return;
    const newComp = cloneCompWithTrack(get().composition!, trackIndex, (track) => ({
      ...track,
      notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, ...updates } : n),
    }));
    get().loadComposition(newComp);
  },

  addNote: (trackIndex: number, note: Note) => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      notes: [...(track.notes || []), note],
    }));
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  removeNote: (trackIndex: number, noteIndex: number) => {
    const comp = get().composition;
    if (!comp) return;
    // Update state without reloading the entire audio engine (prevents pop/jump)
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      notes: track.notes?.filter((_, i) => i !== noteIndex),
    }));
    // Save undo state
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] });
    // Reload audio engine in background (non-disruptive since we're paused)
    try { getEngine().loadComposition(newComp); } catch {}
  },

  undo: () => {
    const { undoStack, redoStack, composition } = get();
    if (undoStack.length === 0) return;
    const target = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: composition ? [...redoStack, composition] : redoStack,
    });
    getEngine().loadComposition(target);
    set({
      composition: target,
      bpm: target.bpm,
      swing: target.swing || 0,
      revealedTracks: allTrackIndices(target.tracks),
      isStreamingTracks: false,
    });
  },

  redo: () => {
    const { undoStack, redoStack, composition } = get();
    if (redoStack.length === 0) return;
    const target = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: composition ? [...undoStack, composition] : undoStack,
    });
    getEngine().loadComposition(target);
    set({
      composition: target,
      bpm: target.bpm,
      swing: target.swing || 0,
      revealedTracks: allTrackIndices(target.tracks),
      isStreamingTracks: false,
    });
  },

  setApiKey: (key: string) => {
    try { localStorage.setItem('brewbeats-apikey', key); } catch {}
    set({ apiKey: key });
  },
  setModel: (model: string) => {
    try { localStorage.setItem('brewbeats-model', model); } catch {}
    set({ model });
  },
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

  exportWav: async () => {
    try {
      const blob = await getEngine().exportWav();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${get().composition?.title || 'brewbeats'}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  },

  // ===== SESSION MANAGEMENT =====

  saveCurrentSession: () => {
    const state = get();
    if (!state.currentSessionId) return;
    const meta = state.sessionList.find((s) => s.id === state.currentSessionId);
    storage.saveSession({
      id: state.currentSessionId,
      name: meta?.name || 'Untitled Session',
      composition: state.composition,
      messages: state.messages,
      undoStack: state.undoStack.slice(-10),
      redoStack: state.redoStack.slice(-10),
      trackVolumes: state.trackVolumes,
      trackMutes: state.trackMutes,
      trackSolos: state.trackSolos,
      bpm: state.bpm,
      swing: state.swing,
      createdAt: meta?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    set({ sessionList: storage.getSessionList() });
  },

  // ═══════════════════════════════════════════════
  //  AI ADVISOR ACTIONS
  // ═══════════════════════════════════════════════
  toggleAdvisor: () => set({ advisorOpen: !get().advisorOpen }),
  toggleGhostOnlyView: () => {
    // Stop playback when switching modes to prevent audio glitch
    if (get().isPlaying) {
      getEngine().stop();
      getEngine().markDirty();
      set({ isPlaying: false, currentBeat: 0 });
    }
    set({ ghostOnlyView: !get().ghostOnlyView });
  },
  clearAdvisor: () => set({ advisorMessages: [] as AdvisorMessage[], ghostNotes: [] as GhostNote[], highlightedNotes: [] as NoteHighlight[], isAdvisorGenerating: false }),

  addGhostNotes: (notes) => {
    const pending = get().ghostNotes.filter(g => g.status === 'pending');
    if (pending.length + notes.length > 50) return;
    set({ ghostNotes: [...get().ghostNotes, ...notes] });
  },
  clearGhostNotes: () => set({ ghostNotes: [] as GhostNote[] }),

  acceptGhostNote: (id) => {
    const ghost = get().ghostNotes.find(g => g.id === id);
    if (!ghost || ghost.status !== 'pending') return;
    const comp = get().composition;
    if (!comp) return;
    const undoStack = [...get().undoStack, comp];
    const newComp: Composition = JSON.parse(JSON.stringify(comp));

    // Check if this ghost belongs to a new instrument group
    const ghostInst = get().ghostInstruments.find(gi => gi.groupId === ghost.groupId && gi.action === 'add');
    if (ghostInst && !newComp.tracks.some(t => t.instrument === ghostInst.instrument)) {
      // Create the new instrument track first
      const newTrack: Track = { instrument: ghostInst.instrument, volume: 0.7, muted: false, solo: false, notes: [], effects: { reverb: 0, delay: 0 } };
      newComp.tracks.push(newTrack);
    }

    if (ghost.replacesNote) {
      const ri = ghost.replacesNote;
      const t = newComp.tracks[ri.trackIndex];
      if (t?.notes) t.notes = t.notes.filter(n => !(n.time === ri.time && n.note === ri.note));
    }

    // Find the right track — for new instruments, it's the last track we just pushed
    let track = newComp.tracks[ghost.trackIndex];
    if (!track && ghostInst) {
      track = newComp.tracks.find(t => t.instrument === ghostInst.instrument) || null as any;
    }
    if (track) {
      if (!track.notes) track.notes = [];
      track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
    }

    set({
      composition: newComp, undoStack, redoStack: [] as Composition[],
      ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, status: 'accepted' as const } : g),
      revealedTracks: allTrackIndices(newComp.tracks),
      ghostOnlyView: false,
    });
  },

  rejectGhostNote: (id) => {
    const newCount = get().rejectionCount + 1;
    set({ ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, status: 'rejected' as const } : g), rejectionCount: newCount });
    // After 3+ rejections, AI will ask scoping questions (handled in askAdvisor)
  },

  acceptGroup: (groupId) => {
    const ghosts = get().ghostNotes.filter(g => g.groupId === groupId && g.status === 'pending');
    const ghostInsts = get().ghostInstruments.filter(g => g.groupId === groupId && g.status === 'pending');
    if (ghosts.length === 0 && ghostInsts.length === 0) return;
    const comp = get().composition;
    if (!comp) return;
    const undoStack = [...get().undoStack, comp];
    const newComp: Composition = JSON.parse(JSON.stringify(comp));

    // Create new instrument tracks from ghost instruments
    for (const gi of ghostInsts) {
      if (gi.action === 'add') {
        const giNotes = ghosts.filter(g => g.groupId === gi.groupId);
        const newTrack: Track = {
          instrument: gi.instrument,
          volume: 0.7,
          muted: false,
          solo: false,
          notes: giNotes.map(g => ({ note: g.note, duration: g.duration, time: g.time, velocity: g.velocity })),
          effects: { reverb: 0, delay: 0 },
        };
        newComp.tracks.push(newTrack);
      }
    }

    // Add ghost notes to existing tracks (skip notes belonging to new instruments)
    const newInstGroupIds = new Set(ghostInsts.filter(g => g.action === 'add').map(g => g.groupId));
    for (const ghost of ghosts) {
      if (newInstGroupIds.has(ghost.groupId)) continue; // already added via new instrument track
      if (ghost.replacesNote) {
        const t = newComp.tracks[ghost.replacesNote.trackIndex];
        if (t?.notes) t.notes = t.notes.filter(n => !(n.time === ghost.replacesNote!.time && n.note === ghost.replacesNote!.note));
      }
      const track = newComp.tracks[ghost.trackIndex];
      if (track) {
        if (!track.notes) track.notes = [];
        track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
      }
    }

    set({
      composition: newComp,
      undoStack,
      redoStack: [] as Composition[],
      ghostNotes: get().ghostNotes.map(g => g.groupId === groupId && g.status === 'pending' ? { ...g, status: 'accepted' as const } : g),
      ghostInstruments: get().ghostInstruments.map(g => g.groupId === groupId && g.status === 'pending' ? { ...g, status: 'accepted' as const } : g),
      revealedTracks: allTrackIndices(newComp.tracks),
      ghostOnlyView: false,
    });
    // Reload engine with the updated composition
    try { getEngine().loadComposition(newComp); } catch {}
  },

  rejectGroup: (groupId) => {
    const count = get().ghostNotes.filter(g => g.groupId === groupId && g.status === 'pending').length;
    set({ ghostNotes: get().ghostNotes.map(g => g.groupId === groupId && g.status === 'pending' ? { ...g, status: 'rejected' as const } : g), rejectionCount: get().rejectionCount + count });
  },

  acceptAllGhosts: () => {
    const pending = get().ghostNotes.filter(g => g.status === 'pending');
    if (pending.length === 0) return;
    const groupIds = Array.from(new Set(pending.map(g => g.groupId)));
    for (const gid of groupIds) get().acceptGroup(gid);
  },

  rejectAllGhosts: () => {
    set({ ghostNotes: get().ghostNotes.map(g => g.status === 'pending' ? { ...g, status: 'rejected' as const } : g) });
  },

  editGhostNote: (id, updates) => {
    set({ ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, ...updates } : g) });
  },

  lockRejection: (id) => {
    const ghost = get().ghostNotes.find(g => g.id === id);
    if (!ghost) return;
    const lock: LockedRejection = { type: 'note', trackIndex: ghost.trackIndex, note: ghost.note, time: ghost.time };
    set({
      ghostNotes: get().ghostNotes.map(g => g.id === id ? { ...g, locked: true, status: 'rejected' as const } : g),
      lockedRejections: [...get().lockedRejections, lock],
    });
  },

  setHighlights: (highlights) => set({ highlightedNotes: highlights }),
  clearHighlights: () => set({ highlightedNotes: [] as NoteHighlight[] }),

  applyRemoval: (highlights) => {
    const comp = get().composition;
    if (!comp) return;
    const undoStack = [...get().undoStack, comp];
    const newComp: Composition = JSON.parse(JSON.stringify(comp));
    for (const h of highlights) {
      const track = newComp.tracks[h.trackIndex];
      if (!track) continue;
      if (h.note && track.notes) track.notes = track.notes.filter(n => !(n.time === h.time && n.note === h.note));
      else if (h.drum && track.pattern) track.pattern = track.pattern.filter(p => !(p.time === h.time && p.drum === h.drum));
    }
    set({ composition: newComp, undoStack, redoStack: [] as Composition[], highlightedNotes: [] as NoteHighlight[] });
  },

  askAdvisor: async (question) => {
    if (get().isAdvisorGenerating || !get().composition) return;

    // If user has rejected 3+ changes, prepend a scoping context
    let finalQuestion = question;
    const rejCount = get().rejectionCount;
    if (rejCount >= 5) {
      const locked = get().lockedRejections;
      const lockedDesc = locked.map(l => `${l.note || l.instrument} at ${l.time || 'track ' + l.trackIndex}`).join(', ');
      finalQuestion = `IMPORTANT CONTEXT: The user has rejected ${rejCount} of your previous suggestions. They have permanently locked these rejections: [${lockedDesc || 'none specified'}]. Before making more suggestions, ask the user 1-2 yes/no questions to understand what direction they want. Focus on understanding their preferences before suggesting changes. Their question: ${question}`;
      set({ rejectionCount: 0 }); // Reset counter after scoping
    }

    const userMsg: AdvisorMessage = { id: 'am_' + Date.now(), role: 'user', content: question, timestamp: Date.now() };
    set({ advisorMessages: [...get().advisorMessages, userMsg], isAdvisorGenerating: true, highlightedNotes: [] as NoteHighlight[] });

    try {
      const lockedRejections = get().lockedRejections;
      const comp = get().composition;
      if (!comp) { set({ isAdvisorGenerating: false }); return; }

      // Build conversation history for session memory
      const history = get().advisorMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          composition: comp,
          question: finalQuestion,
          model: get().model,
          lockedRejections,
          conversationHistory: history,
        }),
      });

      if (!response.ok || !response.body) {
        const errMsg: AdvisorMessage = { id: 'am_err_' + Date.now(), role: 'assistant', content: 'Sorry, I couldn\'t analyze your composition right now. Please try again.', timestamp: Date.now() };
        set({ advisorMessages: [...get().advisorMessages, errMsg], isAdvisorGenerating: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]' || !data) continue;
            try { const p = JSON.parse(data); const t = p.choices?.[0]?.delta?.content; if (t) fullText += t; } catch {}
          }
        }
      } catch { /* stream read error — use whatever we got */ }

      if (!fullText.trim()) {
        const errMsg: AdvisorMessage = { id: 'am_err_' + Date.now(), role: 'assistant', content: 'No response received. The AI might be busy — try again.', timestamp: Date.now() };
        set({ advisorMessages: [...get().advisorMessages, errMsg], isAdvisorGenerating: false });
        return;
      }

      let message = fullText;
      let suggestions: Suggestion[] = [];
      try {
        const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/) || fullText.match(/(\{[\s\S]*"suggestions"[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (parsed.message) message = parsed.message;
          if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions;
        }
      } catch { /* JSON parse failed — just use the raw text as message */ }

      const newGhosts: GhostNote[] = [];
      const newGhostInstruments: GhostInstrument[] = [];
      const newHighlights: NoteHighlight[] = [];

      try {
        for (const sg of suggestions) {
          if (!sg || typeof sg !== 'object') continue;
          sg.id = sg.id || suggestionId();
          sg.status = 'pending';

          const sgAny = sg as any;
          if (sgAny.newInstrument && typeof sgAny.newInstrument === 'string') {
            newGhostInstruments.push({ id: ghostId(), instrument: sgAny.newInstrument, groupId: sg.id, action: 'add', status: 'pending' });
          }
          if (typeof sgAny.removeTrack === 'number') {
            newGhostInstruments.push({ id: ghostId(), instrument: comp.tracks[sgAny.removeTrack]?.instrument || 'unknown', groupId: sg.id, action: 'delete', existingTrackIndex: sgAny.removeTrack, status: 'pending' });
          }
          if (Array.isArray(sg.ghostNotes)) {
            for (const gn of sg.ghostNotes) {
              if (!gn || typeof gn.trackIndex !== 'number' || !gn.note || !gn.time) continue;
              const isLocked = lockedRejections.some(l => l.trackIndex === gn.trackIndex && l.note === gn.note && l.time === gn.time);
              if (isLocked) continue;
              gn.id = ghostId();
              gn.groupId = sg.id;
              gn.status = 'pending';
              gn.action = gn.action || (sg.type === 'remove' ? 'delete' : sg.type === 'modify' ? 'modify' : 'add');
              if (!gn.duration) gn.duration = '4n';
              if (!gn.velocity) gn.velocity = 0.7;
              newGhosts.push(gn);
            }
          }
          if (Array.isArray(sg.highlights)) newHighlights.push(...sg.highlights.filter(h => h && typeof h.trackIndex === 'number'));
        }
      } catch { /* malformed suggestions — proceed with whatever we parsed */ }

      const assistantMsg: AdvisorMessage = { id: 'am_' + Date.now(), role: 'assistant', content: message, suggestions: suggestions.length > 0 ? suggestions : undefined, timestamp: Date.now() };
      set({
        advisorMessages: [...get().advisorMessages, assistantMsg],
        ghostNotes: [...get().ghostNotes, ...newGhosts],
        ghostInstruments: [...get().ghostInstruments, ...newGhostInstruments],
        highlightedNotes: newHighlights,
        isAdvisorGenerating: false,
      });
    } catch (err) {
      // Catch-all — show error message in the advisor chat
      const errMsg: AdvisorMessage = { id: 'am_err_' + Date.now(), role: 'assistant', content: 'Something went wrong analyzing your composition. Please try again.', timestamp: Date.now() };
      set({ advisorMessages: [...get().advisorMessages, errMsg], isAdvisorGenerating: false });
    }
  },

  // ═══════════════════════════════════════════════
  //  BEAT EDITOR ACTIONS
  // ═══════════════════════════════════════════════
  openEditor: () => {
    // Don't open editor during generation or if no composition
    if (get().isGenerating || get().isStreamingTracks || !get().composition) return;
    set({ editorOpen: true });
  },
  closeEditor: () => {
    set({ editorOpen: false, selectedTrackIndex: null, editorTool: 'pencil' as const });
    const comp = get().composition;
    if (comp) { try { getEngine().loadComposition(comp); } catch {} }
  },
  setSelectedTrack: (index) => set({ selectedTrackIndex: index }),
  setEditorTool: (tool) => set({ editorTool: tool }),
  setEditorSnap: (snap) => set({ editorSnap: snap }),

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
    set({ composition: newComp, undoStack, redoStack: [] as Composition[], revealedTracks: allTrackIndices(newComp.tracks) });
    try { getEngine().loadComposition(newComp); } catch {}
  },

  deleteTrack: (trackIndex: number) => {
    const comp = get().composition;
    if (!comp || comp.tracks.length <= 1) return;
    const newComp = { ...comp, tracks: comp.tracks.filter((_, i) => i !== trackIndex) };
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[], revealedTracks: allTrackIndices(newComp.tracks), selectedTrackIndex: null });
    try { getEngine().loadComposition(newComp); } catch {}
  },

  duplicateTrack: (trackIndex: number) => {
    const comp = get().composition;
    if (!comp) return;
    const clone: Track = JSON.parse(JSON.stringify(comp.tracks[trackIndex]));
    const newComp = { ...comp, tracks: [...comp.tracks, clone] };
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[], revealedTracks: allTrackIndices(newComp.tracks) });
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
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  moveNote: (trackIndex, noteIndex, newTime) => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, time: newTime } : n),
    }));
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  resizeNote: (trackIndex, noteIndex, newDuration) => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      notes: track.notes?.map((n, i) => i === noteIndex ? { ...n, duration: newDuration } : n),
    }));
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  addDrumHit: (trackIndex, hit) => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      pattern: [...(track.pattern || []), hit],
    }));
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  removeDrumHit: (trackIndex, hitIndex) => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = cloneCompWithTrack(comp, trackIndex, (track) => ({
      ...track,
      pattern: track.pattern?.filter((_, i) => i !== hitIndex),
    }));
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
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
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
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
    set({ composition: newComp });
  },

  addMeasure: () => {
    const comp = get().composition;
    if (!comp) return;
    const newComp = { ...comp, measures: comp.measures + 1 };
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  removeMeasure: () => {
    const comp = get().composition;
    if (!comp || comp.measures <= 1) return;
    const newComp = { ...comp, measures: comp.measures - 1 };
    const undoStack = [...get().undoStack, comp];
    set({ composition: newComp, undoStack, redoStack: [] as Composition[] });
  },

  createSession: (name?: string) => {
    get().saveCurrentSession();
    getEngine().dispose();
    const id = createFreshSession(name || 'Untitled Session');
    set({
      currentSessionId: id,
      ...FRESH_SESSION_STATE,
      sessionList: storage.getSessionList(),
    });
  },

  switchSession: (id: string) => {
    if (id === get().currentSessionId) return;
    get().saveCurrentSession();

    const engine = getEngine();
    engine.dispose();

    const session = storage.loadSession(id);
    if (!session) return;

    storage.setActiveSessionId(id);

    set({
      currentSessionId: session.id,
      composition: session.composition,
      messages: session.messages,
      undoStack: session.undoStack,
      redoStack: session.redoStack,
      trackVolumes: session.trackVolumes,
      trackMutes: session.trackMutes,
      trackSolos: session.trackSolos,
      bpm: session.bpm,
      swing: session.swing,
      isPlaying: false,
      currentBeat: 0,
      sessionList: storage.getSessionList(),
      revealedTracks: session.composition ? allTrackIndices(session.composition.tracks) : [],
      isStreamingTracks: false,
    });

    if (session.composition) {
      engine.loadComposition(session.composition);
    }
  },

  renameSession: (id: string, name: string) => {
    storage.renameSession(id, name);
    set({ sessionList: storage.getSessionList() });
  },

  deleteSession: (id: string) => {
    const state = get();
    storage.deleteSession(id);
    const newList = storage.getSessionList();

    if (id === state.currentSessionId) {
      if (newList.length > 0) {
        set({ sessionList: newList });
        get().switchSession(newList[0].id);
      } else {
        set({ sessionList: [] });
        get().createSession();
      }
    } else {
      set({ sessionList: newList });
    }
  },
}));

// Auto-save debounce: save session 2s after last relevant state change
let saveTimer: ReturnType<typeof setTimeout> | null = null;
if (typeof window !== 'undefined') {
  useStore.subscribe((state, prevState) => {
    if (
      state.composition !== prevState.composition ||
      state.messages !== prevState.messages ||
      state.undoStack !== prevState.undoStack ||
      state.trackVolumes !== prevState.trackVolumes ||
      state.bpm !== prevState.bpm ||
      state.swing !== prevState.swing
    ) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        state.saveCurrentSession();
      }, 2000);
    }
  });
}
