'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/use-store';
import { getInstrumentColor } from '@/types/composition';
import { getInstrumentConfig } from '@/lib/audio/instrument-registry';

const MIXER_CARD_WIDTH = 140; // w-[140px] + gap
const MIXER_GAP = 8; // gap-2 = 0.5rem = 8px

export function Mixer() {
  const [collapsed, setCollapsed] = useState(false);
  const mixerScrollRef = useRef<HTMLDivElement>(null);
  const prevRevealedRef = useRef(0);
  const {
    composition,
    trackVolumes,
    trackMutes,
    trackSolos,
    revealedTracks,
    isStreamingTracks,
    setTrackVolume,
    toggleMute,
    toggleSolo,
    setTrackEffect,
    ghostNotes,
    ghostInstruments,
    ghostOnlyView,
    toggleGhostOnlyView,
  } = useStore();

  // Sync horizontal scroll with timeline if requested
  useEffect(() => {
    const handleSync = (e: any) => {
      if (mixerScrollRef.current) {
        mixerScrollRef.current.scrollLeft = e.detail;
      }
    };
    window.addEventListener('sync-timeline-scroll', handleSync);
    return () => window.removeEventListener('sync-timeline-scroll', handleSync);
  }, []);

  // Convert vertical scroll into horizontal scroll on mixer
  useEffect(() => {
    const container = mixerScrollRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [collapsed]);

  // Auto-scroll horizontally to the most recently revealed instrument
  useEffect(() => {
    if (!composition || collapsed) return;
    const count = revealedTracks.length;
    if (count > prevRevealedRef.current && mixerScrollRef.current) {
      prevRevealedRef.current = count;
      // Scroll to reveal the last card
      const targetX = count * (MIXER_CARD_WIDTH + MIXER_GAP) - mixerScrollRef.current.clientWidth + MIXER_CARD_WIDTH;
      if (targetX > mixerScrollRef.current.scrollLeft) {
        mixerScrollRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
      }
    }
    if (!isStreamingTracks) prevRevealedRef.current = 0;
  }, [revealedTracks, composition, collapsed, isStreamingTracks]);

  if (!composition) return null;

  const totalTracks = composition.tracks.length;
  const revealedCount = revealedTracks.length;

  return (
    <div className="bg-roast border-t border-roast-light relative z-[1] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2 border-b border-roast-light/50 flex items-center gap-2 hover:bg-roast-light/30 transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={`text-warm-dim transition-transform ${collapsed ? '-rotate-90' : ''}`}
        >
          <polygon points="0,0 10,5 0,10" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-caramel">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span className="text-xs font-medium text-cream">Mixer</span>
        <span className="text-[10px] text-warm-dim ml-1">
          {isStreamingTracks ? (
            <span className="text-caramel">
              Loading {revealedCount}/{totalTracks}
              <span className="inline-flex ml-1 gap-px">
                <span className="w-1 h-1 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '100ms' }} />
                <span className="w-1 h-1 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '200ms' }} />
              </span>
            </span>
          ) : (
            `(${totalTracks} tracks)`
          )}
        </span>

        {/* Ghost notes indicator + toggle */}
        {ghostNotes.filter(g => g.status === 'pending').length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleGhostOnlyView(); }}
            className={`ml-2 text-[9px] px-2 py-0.5 rounded-full transition-colors ${
              ghostOnlyView
                ? 'bg-caramel/20 text-caramel border border-caramel/30'
                : 'bg-dusk/20 text-dusk-light border border-dusk/30 hover:bg-dusk/30'
            }`}
            title={ghostOnlyView ? 'Showing AI notes only — click to show all' : 'AI suggestions pending — click for AI view'}
          >
            ◈ {ghostNotes.filter(g => g.status === 'pending').length} AI notes {ghostOnlyView ? '(AI View)' : ''}
          </button>
        )}
      </button>

      {/* Mixer content */}
      {!collapsed && (
        <div ref={mixerScrollRef} className="flex gap-2 p-3 overflow-x-auto min-w-0 mixer-track-container" style={{ maxWidth: '100%' }}>
          {composition.tracks.map((track, idx) => {
            const isVisible = revealedTracks.includes(idx);
            if (!isVisible) return null;

            const vol = trackVolumes[track.instrument] ?? track.volume;
            const muted = trackMutes[track.instrument] ?? false;
            const soloed = trackSolos[track.instrument] ?? false;
            const color = getInstrumentColor(track.instrument);
            const config = getInstrumentConfig(track.instrument);
            const icon = config.icon;

            return (
              <div
                key={`${track.instrument}-${idx}`}
                className={`flex-none w-[140px] bg-espresso rounded-lg p-2.5 border transition-all mixer-card-stream ${
                  soloed
                    ? 'border-caramel/60'
                    : muted
                    ? 'border-roast-light/30 opacity-50'
                    : 'border-roast-light/50'
                }`}
              >
                {/* Instrument label */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-espresso flex-none mixer-icon-pulse"
                    style={{ backgroundColor: color }}
                  >
                    {icon}
                  </div>
                  <span className="text-[11px] text-cream truncate capitalize">
                    {config?.name || track.instrument}
                  </span>
                </div>

                {/* Volume slider */}
                <div className="mb-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(vol * 100)}
                    onChange={(e) => setTrackVolume(track.instrument, Number(e.target.value) / 100)}
                    className="w-full h-1"
                  />
                  <div className="text-[9px] text-warm-dim text-center mt-0.5">
                    {Math.round(vol * 100)}%
                  </div>
                </div>

                {/* Effects */}
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-warm-dim w-6">Rev</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={(track.effects?.reverb ?? 0) * 100}
                      onChange={(e) =>
                        setTrackEffect(track.instrument, 'reverb', Number(e.target.value) / 100)
                      }
                      className="flex-1 h-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-warm-dim w-6">Dly</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={(track.effects?.delay ?? 0) * 100}
                      onChange={(e) =>
                        setTrackEffect(track.instrument, 'delay', Number(e.target.value) / 100)
                      }
                      className="flex-1 h-0.5"
                    />
                  </div>
                </div>

                {/* Mute / Solo buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleMute(track.instrument)}
                    className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
                      muted
                        ? 'bg-red-900/60 text-red-300'
                        : 'bg-roast-light text-warm-dim hover:text-cream'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleSolo(track.instrument)}
                    className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
                      soloed
                        ? 'bg-caramel/30 text-caramel'
                        : 'bg-roast-light text-warm-dim hover:text-cream'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}

          {/* Ghost instrument mixer cards */}
          {ghostInstruments.filter(gi => gi.action === 'add' && gi.status === 'pending').map(gi => {
            const giColor = getInstrumentColor(gi.instrument);
            const giConfig = getInstrumentConfig(gi.instrument);
            return (
              <div key={`gi-mixer-${gi.id}`} className="flex-none w-[140px] rounded-lg p-2.5 border-2 border-dashed" style={{ borderColor: `${giColor}60`, background: 'rgba(42,31,26,0.4)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-espresso flex-none border border-dashed" style={{ backgroundColor: `${giColor}80`, borderColor: giColor }}>{giConfig.icon}</div>
                  <span className="text-[10px] text-cream/60 truncate font-medium">{giConfig.name}</span>
                </div>
                <div className="text-[8px] text-caramel/50 text-center py-2">AI Suggested</div>
              </div>
            );
          })}

          {/* Streaming placeholder cards for tracks not yet revealed */}
          {isStreamingTracks && Array.from({ length: totalTracks - revealedCount }, (_, i) => (
            <div
              key={`placeholder-${i}`}
              className="flex-none w-[140px] h-[180px] rounded-lg border border-roast-light/20 mixer-card-placeholder"
            />
          ))}
        </div>
      )}
    </div>
  );
}
