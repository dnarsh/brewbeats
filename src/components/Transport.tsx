'use client';

import { useStore } from '@/store/use-store';

interface TransportProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export function Transport({ onToggleFullscreen, isFullscreen }: TransportProps) {
  const {
    composition,
    isPlaying,
    isGenerating,
    isStreamingTracks,
    bpm,
    swing,
    currentBeat,
    play,
    pause,
    stop,
    setBpm,
    setSwing,
    undo,
    redo,
    undoStack,
    redoStack,
    exportWav,
    initAudio,
    audioReady,
    ghostNotes,
    ghostOnlyView,
    toggleGhostOnlyView,
  } = useStore();

  const pendingGhosts = ghostNotes.filter(g => g.status === 'pending').length;

  const handlePlayPause = async () => {
    if (!audioReady) {
      await initAudio();
    }
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div className="bg-roast border-t border-roast-light px-4 py-2 flex items-center gap-4 relative z-[1]">
      {/* Transport controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={stop}
          disabled={!composition || isGenerating || isStreamingTracks}
          className="w-8 h-8 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Stop"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="2" width="8" height="8" rx="1" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          disabled={!composition || isGenerating || isStreamingTracks}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-gradient-to-br from-caramel to-gold text-espresso hover:from-cream hover:to-gold shadow-[0_0_12px_rgba(232,192,108,0.4)]'
              : 'bg-roast-light hover:bg-caramel/20 text-caramel hover:text-cream disabled:opacity-30 disabled:text-warm-dim'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="3,1 13,7 3,13" />
            </svg>
          )}
        </button>
      </div>

      {/* A/B Compare — toggle between original and AI version */}
      {pendingGhosts > 0 && (
        <button
          onClick={toggleGhostOnlyView}
          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            ghostOnlyView
              ? 'bg-caramel/20 text-caramel border border-caramel/30'
              : 'bg-roast-light text-warm-dim hover:text-cream'
          }`}
          title={ghostOnlyView ? 'Playing AI version — click for original' : 'Playing original — click for AI version'}
        >
          {ghostOnlyView ? 'B: AI' : 'A: Original'}
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-roast-light" />

      {/* BPM */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider">BPM</span>
        <button
          onClick={() => setBpm(bpm - 1)}
          className="w-5 h-5 rounded bg-roast-light text-warm-dim hover:text-cream text-xs flex items-center justify-center"
        >
          -
        </button>
        <span className="text-sm font-mono text-cream w-8 text-center">{bpm}</span>
        <button
          onClick={() => setBpm(bpm + 1)}
          className="w-5 h-5 rounded bg-roast-light text-warm-dim hover:text-cream text-xs flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Swing */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-warm-dim uppercase tracking-wider">Swing</span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(swing * 100)}
          onChange={(e) => setSwing(Number(e.target.value) / 100)}
          className="w-16 h-1"
        />
        <span className="text-[10px] text-warm-dim w-6">{Math.round(swing * 100)}%</span>
      </div>

      {/* Key & Time Sig display */}
      {composition && (
        <>
          <div className="w-px h-6 bg-roast-light" />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-warm-dim">
              Key: <span className="text-cream">{composition.key}</span>
            </span>
            <span className="text-warm-dim">
              Time: <span className="text-cream">{composition.timeSignature}</span>
            </span>
            <span className="text-warm-dim">
              Bars: <span className="text-cream">{composition.measures}</span>
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live duration timer */}
      {composition && (
        <div className="flex items-center gap-1.5 text-xs font-mono" title="Elapsed / Total duration">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warm-dim">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {(() => {
            const beatsPerMeasure = parseInt(composition.timeSignature?.split('/')[0]) || 4;
            const totalBeats = composition.measures * beatsPerMeasure;
            const totalSeconds = (totalBeats / bpm) * 60;
            const elapsedSeconds = isPlaying ? (currentBeat / beatsPerMeasure / composition.measures) * totalSeconds : 0;

            const fmtTime = (s: number) => {
              const m = Math.floor(s / 60);
              const sec = Math.floor(s % 60);
              return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
            };

            return (
              <span className="text-cream tabular-nums">
                {isPlaying ? (
                  <><span className="text-caramel">{fmtTime(elapsedSeconds)}</span>{' / '}{fmtTime(totalSeconds)}</>
                ) : (
                  fmtTime(totalSeconds)
                )}
              </span>
            );
          })()}
        </div>
      )}

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Undo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Redo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 14 20 9 15 4" />
            <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
          </svg>
        </button>
      </div>

      {/* Beat Editor */}
      <button
        onClick={() => useStore.getState().openEditor()}
        disabled={!composition || isGenerating || isStreamingTracks}
        className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream hover:bg-caramel/20 disabled:opacity-30 flex items-center justify-center transition-colors"
        title="Beat Editor"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Fullscreen toggle */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="w-7 h-7 rounded bg-roast-light text-warm-dim hover:text-cream hover:bg-caramel/20 flex items-center justify-center transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Timeline'}
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      )}

      {/* Export WAV */}
      <button
        onClick={exportWav}
        disabled={!composition}
        className="px-3 py-1.5 rounded-lg bg-dusk/40 hover:bg-dusk/60 text-cream text-xs font-medium disabled:opacity-30 transition-colors flex items-center gap-1.5"
        title="Export WAV"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        WAV
      </button>

      {/* Export MIDI */}
      <button
        onClick={() => {
          if (composition) {
            import('@/lib/midi-export').then(m => m.exportMidi(composition));
          }
        }}
        disabled={!composition}
        className="px-3 py-1.5 rounded-lg bg-caramel/20 hover:bg-caramel/40 text-caramel text-xs font-medium disabled:opacity-30 transition-colors flex items-center gap-1.5"
        title="Export MIDI — open in any DAW"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        MIDI
      </button>
    </div>
  );
}
