'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/use-store';

// Find tracks by keyword match (e.g. "bass" matches "electric_bass", "sub_bass", etc.)
function findTracks(store: ReturnType<typeof useStore.getState>, ...keywords: string[]) {
  if (!store.composition) return [];
  return store.composition.tracks.filter(t => {
    const name = t.instrument.toLowerCase();
    return keywords.some(k => name.includes(k));
  });
}

interface SavedState {
  volumes: Record<string, number>;
  effects: Record<string, { reverb: number; delay: number }>;
  swing?: number;
}

interface EffectPreset {
  name: string;
  icon: string;
  description: string;
  toggleable: boolean;
  apply: (store: ReturnType<typeof useStore.getState>) => void;
}

const EFFECT_PRESETS: EffectPreset[] = [
  {
    name: 'Punch Bass',
    icon: '💥',
    description: 'Boost bass volume and add punch',
    toggleable: true,
    apply: (s) => {
      const tracks = findTracks(s, 'bass', 'sub');
      if (tracks.length === 0) return;
      tracks.forEach(t => {
        s.setTrackVolume(t.instrument, Math.min(1, (s.trackVolumes[t.instrument] ?? 0.7) + 0.2));
        s.setTrackEffect(t.instrument, 'reverb', 0.1);
      });
    },
  },
  {
    name: 'Spacey Reverb',
    icon: '🌌',
    description: 'Add reverb to all tracks',
    toggleable: true,
    apply: (s) => {
      if (!s.composition) return;
      s.composition.tracks.forEach((t) => {
        s.setTrackEffect(t.instrument, 'reverb', 0.5);
      });
    },
  },
  {
    name: 'Dry Mix',
    icon: '🔊',
    description: 'Remove all effects',
    toggleable: true,
    apply: (s) => {
      if (!s.composition) return;
      s.composition.tracks.forEach((t) => {
        s.setTrackEffect(t.instrument, 'reverb', 0);
        s.setTrackEffect(t.instrument, 'delay', 0);
      });
    },
  },
  {
    name: 'Echo Delay',
    icon: '🔁',
    description: 'Add delay to melodic tracks',
    toggleable: true,
    apply: (s) => {
      if (!s.composition) return;
      s.composition.tracks.forEach((t) => {
        const name = t.instrument.toLowerCase();
        if (!name.includes('drum') && !name.includes('bass') && !name.includes('kick') && !name.includes('sub')) {
          s.setTrackEffect(t.instrument, 'delay', 0.4);
        }
      });
    },
  },
  {
    name: 'Lo-Fi Vibes',
    icon: '📻',
    description: 'Warm reverb + slow swing',
    toggleable: true,
    apply: (s) => {
      s.setSwing(0.25);
      if (!s.composition) return;
      s.composition.tracks.forEach((t) => {
        s.setTrackEffect(t.instrument, 'reverb', 0.35);
        const name = t.instrument.toLowerCase();
        if (!name.includes('drum') && !name.includes('kick')) {
          s.setTrackVolume(t.instrument, Math.min(1, (s.trackVolumes[t.instrument] ?? 0.7) * 0.85));
        }
      });
    },
  },
  {
    name: 'Hard Drums',
    icon: '🥁',
    description: 'Boost drum volume',
    toggleable: true,
    apply: (s) => {
      const tracks = findTracks(s, 'drum', 'kick', 'snare', 'hihat', 'cymbal', 'percussion');
      if (tracks.length === 0) return;
      tracks.forEach(t => {
        s.setTrackVolume(t.instrument, 1);
        s.setTrackEffect(t.instrument, 'reverb', 0.05);
      });
    },
  },
  {
    name: 'Vocal Focus',
    icon: '🎤',
    description: 'Solo vocals with reverb',
    toggleable: true,
    apply: (s) => {
      const tracks = findTracks(s, 'vocal', 'voice', 'sing', 'choir');
      if (tracks.length === 0) return;
      tracks.forEach(t => {
        s.setTrackVolume(t.instrument, 0.9);
        s.setTrackEffect(t.instrument, 'reverb', 0.5);
        s.setTrackEffect(t.instrument, 'delay', 0.2);
      });
    },
  },
  {
    name: 'Speed Up',
    icon: '⏩',
    description: '+10 BPM',
    toggleable: false,
    apply: (s) => s.setBpm(Math.min(200, s.bpm + 10)),
  },
  {
    name: 'Slow Down',
    icon: '⏪',
    description: '-10 BPM',
    toggleable: false,
    apply: (s) => s.setBpm(Math.max(40, s.bpm - 10)),
  },
];

function captureState(s: ReturnType<typeof useStore.getState>): SavedState {
  const saved: SavedState = { volumes: {}, effects: {}, swing: s.swing };
  if (s.composition) {
    s.composition.tracks.forEach(t => {
      saved.volumes[t.instrument] = s.trackVolumes[t.instrument] ?? t.volume;
      saved.effects[t.instrument] = {
        reverb: t.effects?.reverb ?? 0,
        delay: t.effects?.delay ?? 0,
      };
    });
  }
  return saved;
}

function restoreState(s: ReturnType<typeof useStore.getState>, saved: SavedState) {
  if (saved.swing !== undefined) s.setSwing(saved.swing);
  if (!s.composition) return;
  s.composition.tracks.forEach(t => {
    if (t.instrument in saved.volumes) {
      s.setTrackVolume(t.instrument, saved.volumes[t.instrument]);
    }
    if (t.instrument in saved.effects) {
      s.setTrackEffect(t.instrument, 'reverb', saved.effects[t.instrument].reverb);
      s.setTrackEffect(t.instrument, 'delay', saved.effects[t.instrument].delay);
    }
  });
}

export function EffectsSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [activeEffects, setActiveEffects] = useState<Set<number>>(new Set());
  const savedStatesRef = useRef<Map<number, SavedState>>(new Map());
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const composition = useStore((s) => s.composition);
  const audioReady = useStore((s) => s.audioReady);
  const initAudio = useStore((s) => s.initAudio);

  if (!composition) return null;

  const handleToggle = async (fx: EffectPreset, idx: number) => {
    if (!audioReady) await initAudio();

    const store = useStore.getState();

    if (fx.toggleable && activeEffects.has(idx)) {
      // Toggle OFF — restore saved state
      const saved = savedStatesRef.current.get(idx);
      if (saved) restoreState(store, saved);
      savedStatesRef.current.delete(idx);
      setActiveEffects(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    } else {
      // Toggle ON (or one-shot for non-toggleable)
      if (fx.toggleable) {
        // Save current state before applying
        savedStatesRef.current.set(idx, captureState(store));
        setActiveEffects(prev => new Set(prev).add(idx));
      }
      fx.apply(store);
    }

    setFlashIdx(idx);
    setTimeout(() => setFlashIdx(null), 400);
  };

  return (
    <div
      className={`fixed right-0 top-12 bottom-0 z-30 transition-all duration-300 ease-in-out ${
        expanded ? 'w-[180px]' : 'w-[36px]'
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Tab indicator when collapsed */}
      <div
        className={`absolute left-0 top-4 bg-roast border border-roast-light rounded-l-lg transition-opacity duration-200 ${
          expanded ? 'opacity-0' : 'opacity-70 hover:opacity-100'
        }`}
        style={{ width: 36, height: 36 }}
      >
        <div className="flex items-center justify-center h-full text-caramel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="15,3 21,12 15,21 9,12" />
          </svg>
        </div>
      </div>

      {/* Panel */}
      <div
        className={`h-full bg-roast/95 backdrop-blur-sm border-l border-roast-light overflow-y-auto transition-opacity duration-200 ${
          expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-3">
          <h3 className="text-[10px] text-warm-dim uppercase tracking-wider mb-3 font-semibold">Quick FX</h3>

          <div className="space-y-1.5">
            {EFFECT_PRESETS.map((fx, idx) => {
              const isActive = activeEffects.has(idx);
              return (
                <button
                  key={fx.name}
                  onClick={() => handleToggle(fx, idx)}
                  className={`w-full text-left p-2 rounded-lg border transition-all group ${
                    isActive
                      ? 'bg-caramel/15 border-caramel/40'
                      : flashIdx === idx
                        ? 'bg-caramel/10 border-caramel/60'
                        : 'bg-espresso/50 border-transparent hover:bg-espresso hover:border-caramel/20'
                  }`}
                  title={fx.toggleable ? (isActive ? `${fx.description} (click to disable)` : fx.description) : fx.description}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{fx.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-medium transition-colors ${
                        isActive ? 'text-caramel' : 'text-cream group-hover:text-caramel'
                      }`}>
                        {fx.name}
                      </div>
                      <div className="text-[9px] text-warm-dim/60 leading-tight">
                        {fx.description}
                      </div>
                    </div>
                    {fx.toggleable && (
                      <div className={`w-2 h-2 rounded-full flex-none transition-colors ${
                        isActive ? 'bg-caramel' : 'bg-warm-dim/20'
                      }`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
