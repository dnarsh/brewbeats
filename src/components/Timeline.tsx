'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store/use-store';
import { getInstrumentColor } from '@/types/composition';
import { getInstrumentConfig } from '@/lib/audio/instrument-registry';

const DEFAULT_CELL_WIDTH = 36;
const MIN_CELL_WIDTH = 12;
const MAX_CELL_WIDTH = 72;
const ROW_HEIGHT = 52;
const SUBDIVISIONS = 4;
const LABEL_WIDTH = 100;


export function Timeline() {
  const { composition, currentBeat, isPlaying, revealedTracks, isStreamingTracks, lastAddedNoteTime, ghostNotes, ghostInstruments, ghostOnlyView, highlightedNotes } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(DEFAULT_CELL_WIDTH);

  // User override: when user scrolls manually during playback, pause auto-follow temporarily
  const userScrollOverrideRef = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Ctrl+scroll zoom, plain scroll → horizontal scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + container.scrollLeft - LABEL_WIDTH;
        setCellWidth((prev) => {
          const next = Math.min(MAX_CELL_WIDTH, Math.max(MIN_CELL_WIDTH, prev - e.deltaY * 0.05));
          const ratio = next / prev;
          requestAnimationFrame(() => {
            container.scrollLeft = mouseX * ratio - (e.clientX - rect.left - LABEL_WIDTH);
          });
          return next;
        });
      } else {
        // Normal scroll — let vertical scroll be vertical (natural)
        // Only pause auto-follow when user scrolls during playback
        userScrollOverrideRef.current = true;
        clearTimeout(userScrollTimerRef.current);
        userScrollTimerRef.current = setTimeout(() => { userScrollOverrideRef.current = false; }, 3000);
        // Horizontal scroll via shift+wheel or trackpad horizontal
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          container.scrollLeft += e.deltaX || e.deltaY;
          window.dispatchEvent(new CustomEvent('sync-timeline-scroll', { detail: container.scrollLeft }));
        }
        // Vertical scroll passes through naturally (no preventDefault)
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // ═══════════════════════════════════════════════
  //  60fps SMOOTH SCROLL ENGINE (RAF lerp)
  // ═══════════════════════════════════════════════
  const scrollTargetRef = useRef<number>(-1);
  const scrollTargetYRef = useRef<number>(-1);
  const scrollRafRef = useRef<number>(0);

  const scrollSpeedRef = useRef(0.12);

  useEffect(() => {
    // Read scrollRef.current INSIDE tick (not outside) so the RAF loop
    // works even when the scroll container mounts later (composition goes from null → non-null)
    const tick = () => {
      const container = scrollRef.current;
      if (container) {
        const targetX = scrollTargetRef.current;
        if (targetX >= 0) {
          const diff = targetX - container.scrollLeft;
          if (Math.abs(diff) > 0.5) {
            container.scrollLeft += diff * scrollSpeedRef.current;
          }
        }
        const targetY = scrollTargetYRef.current;
        if (targetY >= 0) {
          const diffY = targetY - container.scrollTop;
          if (Math.abs(diffY) > 0.5) {
            container.scrollTop += diffY * 0.15;
          } else {
            scrollTargetYRef.current = -1;
          }
        }
      }
      scrollRafRef.current = requestAnimationFrame(tick);
    };

    scrollRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, []);

  // During PLAYBACK → center the playhead (unless user is manually scrolling)
  useEffect(() => {
    if (!isPlaying || !scrollRef.current || !composition) return;
    if (userScrollOverrideRef.current) return; // User is manually scrolling — don't fight it
    scrollSpeedRef.current = 0.12;
    const playheadX = currentBeat * SUBDIVISIONS * cellWidth;
    const center = scrollRef.current.clientWidth / 2 - LABEL_WIDTH;
    scrollTargetRef.current = Math.max(0, playheadX - center);
  }, [currentBeat, isPlaying, composition, cellWidth]);

  // During STREAMING → don't auto-scroll horizontally (it causes jarring jumps
  // when new tracks start at 0:0:0). Let the user scroll freely.
  // Only reset scroll position to start when a brand new composition loads.
  const prevCompRef = useRef<string | null>(null);
  useEffect(() => {
    if (!composition || !scrollRef.current || isPlaying) return;
    const id = composition.title + (composition.tracks[0]?.instrument || '');
    if (prevCompRef.current !== null && prevCompRef.current !== id && !isStreamingTracks) {
      // New composition loaded (and not currently streaming a patch) — scroll to beginning
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop = 0;
    }
    prevCompRef.current = id;
  }, [composition, isPlaying, isStreamingTracks]);

  // ─── Streaming scroll: follow notes & handle new tracks ───
  const prevRevealedCountRef = useRef(0);
  const prevStreamTrackCountRef = useRef(0);
  const wasStreamingRef = useRef(false);

  // When a new track is revealed during streaming, scroll to beginning to show it
  useEffect(() => {
    if (!composition || !scrollRef.current || isPlaying) return;
    const count = revealedTracks.length;

    if (count > prevRevealedCountRef.current) {
      prevRevealedCountRef.current = count;
      // Scroll vertically so the last revealed track is visible
      const headerH = 32;
      const targetY = count * ROW_HEIGHT - scrollRef.current.clientHeight + headerH + ROW_HEIGHT;
      if (targetY > scrollRef.current.scrollTop) {
        scrollTargetYRef.current = targetY;
      }
    }

    if (!isStreamingTracks) prevRevealedCountRef.current = 0;
  }, [revealedTracks, composition, isPlaying, isStreamingTracks]);

  // Follow the rightmost note of the LAST track during streaming
  // When track count changes, snap to beginning for the new track
  useEffect(() => {
    if (!composition || !scrollRef.current || isPlaying || !isStreamingTracks) return;

    const trackCount = composition.tracks.length;
    const lastTrack = composition.tracks[trackCount - 1];
    if (!lastTrack) return;

    // Detect if a new track just appeared
    if (trackCount > prevStreamTrackCountRef.current && prevStreamTrackCountRef.current > 0) {
      // New instrument! Scroll horizontally to beginning to show its first notes
      scrollTargetRef.current = 0;
      scrollSpeedRef.current = 0.2; // Fast snap
      prevStreamTrackCountRef.current = trackCount;
      return; // Don't also try to follow — let it snap first
    }
    prevStreamTrackCountRef.current = trackCount;

    // Find the rightmost note time on the LAST track only
    let rightmostTime: string | null = null;
    if (lastTrack.notes && lastTrack.notes.length > 0) {
      rightmostTime = lastTrack.notes[lastTrack.notes.length - 1]?.time || null;
    } else if (lastTrack.pattern && lastTrack.pattern.length > 0) {
      rightmostTime = lastTrack.pattern[lastTrack.pattern.length - 1]?.time || null;
    }

    if (rightmostTime) {
      const col = timeToCol(rightmostTime);
      if (col >= 0) {
        const targetX = col * cellWidth - scrollRef.current.clientWidth / 2 + LABEL_WIDTH;
        scrollTargetRef.current = Math.max(0, targetX);
        scrollSpeedRef.current = 0.15;
      }
    }
  }, [composition, isPlaying, isStreamingTracks, cellWidth, lastAddedNoteTime]);
  // Note: lastAddedNoteTime in deps triggers this effect when store updates during streaming

  // Scroll back to beginning when streaming ends, then release
  useEffect(() => {
    if (wasStreamingRef.current && !isStreamingTracks && !isPlaying) {
      // Briefly scroll to start, then release
      scrollTargetRef.current = 0;
      scrollTargetYRef.current = 0;
      scrollSpeedRef.current = 0.15;
      prevStreamTrackCountRef.current = 0;
      const t = setTimeout(() => { scrollTargetRef.current = -1; scrollTargetYRef.current = -1; }, 500);
      wasStreamingRef.current = false;
      return () => clearTimeout(t);
    }
    wasStreamingRef.current = isStreamingTracks;
  }, [isStreamingTracks, isPlaying]);

  // Release scroll lock IMMEDIATELY when idle — allow free manual scrolling
  useEffect(() => {
    if (!isPlaying && !isStreamingTracks) {
      scrollTargetRef.current = -1;
      scrollTargetYRef.current = -1;
    }
  }, [isPlaying, isStreamingTracks]);

  // ═══════════════════════════════════════════════
  //  CELL CLICK
  // ═══════════════════════════════════════════════
  const handleCellClick = useCallback((trackIndex: number, col: number) => {
    // Read fresh state to avoid stale closure
    const state = useStore.getState();
    if (!state.composition || state.isPlaying || state.isGenerating || state.isStreamingTracks) return;

    const track = state.composition.tracks[trackIndex];
    if (track.instrument === 'drums') return;

    const time = colToTime(col);
    const existingIdx = track.notes?.findIndex((n) => n.time === time);
    if (existingIdx !== undefined && existingIdx >= 0) {
      state.removeNote(trackIndex, existingIdx);
    }
  }, []);

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  if (!composition) {
    return (
      <div className="flex-1 flex items-center justify-center text-warm-dim">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 opacity-30">&#9835;</div>
          <p className="text-sm font-medium">No composition loaded</p>
          <p className="text-xs mt-1.5 text-warm-dim/50">Use the chat or pick a genre preset</p>
        </div>
      </div>
    );
  }

  const beatsPerMeasure = parseInt(composition.timeSignature?.split('/')[0]) || 4;
  const totalBeats = composition.measures * beatsPerMeasure;
  const totalCells = totalBeats * SUBDIVISIONS;
  const gridWidth = totalCells * cellWidth;

  const getNoteCells = (trackIndex: number) => {
    const track = composition.tracks[trackIndex];
    const cells: { col: number; width: number; label: string; color: string }[] = [];

    if (track.instrument === 'drums' && track.pattern) {
      track.pattern.forEach((hit) => {
        if (!hit.time || !hit.drum) return;
        cells.push({ col: timeToCol(hit.time), width: 1, label: hit.drum[0].toUpperCase(), color: getInstrumentColor(track.instrument) });
      });
    } else if (track.notes) {
      track.notes.forEach((note) => {
        if (!note.time || !note.note) return;
        cells.push({ col: timeToCol(note.time), width: durationToWidth(note.duration), label: note.note, color: getInstrumentColor(track.instrument) });
      });
    }

    cells.sort((a, b) => a.col - b.col);
    return cells;
  };

  const playheadPos = currentBeat * SUBDIVISIONS * cellWidth;
  // Duration of one 16th note tick in seconds — playhead transitions exactly this long for smooth movement
  const tickDuration = composition ? (60 / composition.bpm) / 4 : 0.1;

  return (
    <div className="flex-1 flex flex-col bg-espresso overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-auto timeline-scroll" style={{ willChange: 'scroll-position' }}>
        <div style={{ minWidth: gridWidth + LABEL_WIDTH }}>
          {/* Header */}
          <div className="flex border-b border-roast-light sticky top-0 bg-espresso z-30">
            <div
              className="bg-roast border-r border-roast-light px-3 py-2 text-[10px] text-warm-dim uppercase tracking-wider sticky left-0 z-20 flex items-center"
              style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
            >
              Track
            </div>
            <div className="flex">
              {Array.from({ length: totalBeats }).map((_, beat) => (
                <div
                  key={beat}
                  className={`flex-none text-center text-[10px] py-2 ${
                    beat % beatsPerMeasure === 0 ? 'text-caramel/80 font-semibold' : 'text-warm-dim/40'
                  }`}
                  style={{ width: cellWidth * SUBDIVISIONS }}
                >
                  {beat % beatsPerMeasure === 0
                    ? Math.floor(beat / beatsPerMeasure) + 1
                    : (beat % beatsPerMeasure) + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          {composition.tracks.map((track, trackIndex) => {
            if (!revealedTracks.includes(trackIndex)) return null;

            const config = getInstrumentConfig(track.instrument);
            const allCells = getNoteCells(trackIndex);
            const color = getInstrumentColor(track.instrument);

            return (
              <div
                key={`${track.instrument}-${trackIndex}`}
                className={`flex border-b border-roast-light/40 group ${isStreamingTracks ? 'timeline-track-stream' : ''} ${track.muted ? 'opacity-35' : ''}`}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Label */}
                <div
                  className="bg-roast border-r border-roast-light flex items-center px-2 gap-2 sticky left-0 z-30"
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-espresso flex-none shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {config.icon}
                  </div>
                  <span className="text-[11px] text-cream truncate font-medium" title={config.name}>{config.name}</span>
                </div>

                {/* Grid */}
                <div
                  className="relative overflow-hidden cursor-pointer"
                  style={{
                    width: gridWidth,
                    height: ROW_HEIGHT,
                    // CSS background grid — avoids rendering thousands of divs
                    backgroundImage: [
                      // Subdivision lines (faint)
                      `repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent ${cellWidth}px)`,
                      // Beat lines (medium)
                      `repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS}px)`,
                      // Measure lines (strong)
                      `repeating-linear-gradient(90deg, rgba(200,149,108,0.35) 0px, rgba(200,149,108,0.35) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS * beatsPerMeasure}px)`,
                    ].join(', '),
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const col = Math.floor((e.clientX - rect.left) / cellWidth);
                    handleCellClick(trackIndex, Math.max(0, Math.min(totalCells - 1, col)));
                  }}
                >

                  {/* Real Notes — translucent in ghost-only view */}
                  {allCells.map((cell) => {
                    const noteLeft = cell.col * cellWidth;
                    const noteRight = (cell.col + cell.width) * cellWidth;
                    const isBeingPlayed = isPlaying && playheadPos >= noteLeft && playheadPos < noteRight;
                    return (
                      <div
                        key={`${cell.col}-${cell.label}`}
                        className={`absolute top-1.5 rounded flex items-center justify-center text-[8px] font-semibold text-espresso shadow-sm ${ghostOnlyView ? '' : 'note-hover-glow'} ${
                          isStreamingTracks ? 'note-stream-in' : ''
                        } ${isBeingPlayed && !ghostOnlyView ? 'note-playing' : ''}`}
                        style={{
                          left: noteLeft + 1,
                          width: Math.min(
                            Math.max(cell.width * cellWidth - 2, cellWidth - 2),
                            gridWidth - noteLeft - 2,
                          ),
                          height: ROW_HEIGHT - 12,
                          backgroundColor: cell.color,
                          opacity: ghostOnlyView ? 0.15 : undefined,
                          willChange: isPlaying ? 'filter, transform' : 'auto',
                        }}
                        title={cell.label}
                      >
                        {cell.width >= 1.5 ? cell.label : cell.label.replace(/[0-9]/g, '')}
                      </div>
                    );
                  })}

                  {/* Ghost Notes in main timeline */}
                  {ghostNotes.filter(g => g.trackIndex === trackIndex && g.status === 'pending').map(gn => {
                    const col = timeToCol(gn.time);
                    const w = durationToWidth(gn.duration);
                    const isDelete = gn.action === 'delete';
                    const ghostColor = isDelete ? '#e85a5a' : color;
                    const gnLeft = col * cellWidth;
                    const gnRight = (col + w) * cellWidth;
                    const isGhostPlaying = isPlaying && playheadPos >= gnLeft && playheadPos < gnRight;
                    return (
                      <div
                        key={`ghost-${gn.id}`}
                        className={`absolute top-1.5 rounded flex items-center justify-center text-[7px] font-semibold z-10 overflow-hidden ${isGhostPlaying ? 'note-playing' : ''}`}
                        style={{
                          left: col * cellWidth + 1,
                          width: Math.max(w * cellWidth - 2, cellWidth - 2),
                          height: ROW_HEIGHT - 12,
                          backgroundColor: ghostOnlyView ? ghostColor : `${ghostColor}50`,
                          opacity: ghostOnlyView ? (gn.velocity || 0.7) : 0.4,
                          border: ghostOnlyView ? `2px solid ${ghostColor}` : `2px dashed ${ghostColor}80`,
                          color: isDelete ? '#fca5a5' : ghostOnlyView ? '#1a1210' : '#e8c5a0aa',
                          textDecoration: isDelete ? 'line-through' : 'none',
                          boxShadow: ghostOnlyView ? `0 0 6px ${ghostColor}40` : 'none',
                        }}
                        title={`AI ${gn.action}: ${gn.note}`}
                      >
                        {isDelete ? '✕' : '✨'} {gn.note}
                      </div>
                    );
                  })}

                  {/* Highlights */}
                  {highlightedNotes.filter(h => h.trackIndex === trackIndex).map((h, hi) => {
                    const matchNote = track.notes?.find(n => n.time === h.time && (!h.note || n.note === h.note));
                    if (!matchNote) return null;
                    const col = timeToCol(matchNote.time);
                    const w = durationToWidth(matchNote.duration);
                    const bc = h.color === 'red' ? '#e85a5a' : h.color === 'green' ? '#5ac87a' : '#e8c06c';
                    return (
                      <div key={`hl-${hi}`} className="absolute top-1 rounded pointer-events-none" style={{ left: col * cellWidth, width: Math.max(w * cellWidth, cellWidth), height: ROW_HEIGHT - 10, border: `2px solid ${bc}`, boxShadow: `0 0 6px ${bc}40` }} />
                    );
                  })}

                  {/* Playhead — above everything */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] z-[25] pointer-events-none"
                    style={{
                      left: 0,
                      transform: `translateX(${playheadPos}px)`,
                      background: isPlaying ? 'rgba(240,230,220,0.85)' : 'rgba(200,149,108,0.4)',
                      boxShadow: isPlaying ? '0 0 6px rgba(200,149,108,0.4)' : 'none',
                      transition: isPlaying ? `transform ${tickDuration}s linear` : 'none',
                      willChange: isPlaying ? 'transform' : 'auto',
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Ghost Instrument Tracks */}
          {ghostInstruments.filter(gi => gi.action === 'add' && gi.status === 'pending').map(gi => {
            const giColor = getInstrumentColor(gi.instrument);
            const giConfig = getInstrumentConfig(gi.instrument);
            const giNotes = ghostNotes.filter(g => g.groupId === gi.groupId && g.status === 'pending');
            return (
              <div key={`gi-${gi.id}`} className="flex border-b border-dashed border-caramel/20" style={{ height: ROW_HEIGHT, opacity: ghostOnlyView ? 1 : 0.5 }}>
                <div className="border-r border-roast-light flex items-center px-2 gap-2 sticky left-0 z-30 overflow-hidden" style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, background: '#2a1f1a' }}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-espresso flex-none border-2 border-dashed" style={{ backgroundColor: `${giColor}80`, borderColor: giColor }}>{giConfig.icon}</div>
                  <div className="overflow-hidden min-w-0"><span className="text-[11px] text-cream/70 truncate font-medium block" title={giConfig.name}>{giConfig.name}</span><span className="text-[7px] text-caramel/50">AI</span></div>
                </div>
                <div className="relative" style={{ width: gridWidth, height: ROW_HEIGHT, backgroundImage: `repeating-linear-gradient(90deg, rgba(200,149,108,0.02) 0px, rgba(200,149,108,0.02) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS}px)` }}>
                  {giNotes.map(gn => {
                    const col = timeToCol(gn.time);
                    const w = durationToWidth(gn.duration);
                    return (
                      <div key={`gi-n-${gn.id}`} className="absolute top-1.5 rounded flex items-center justify-center text-[8px] font-semibold text-espresso" style={{ left: col * cellWidth + 1, width: Math.max(w * cellWidth - 2, cellWidth - 2), height: ROW_HEIGHT - 12, backgroundColor: ghostOnlyView ? giColor : `${giColor}60`, border: `2px ${ghostOnlyView ? 'solid' : 'dashed'} ${giColor}`, opacity: ghostOnlyView ? (gn.velocity || 0.7) : 0.4 }} title={`AI: ${gn.note}`}>
                        {gn.note}
                      </div>
                    );
                  })}
                  {/* Playhead for ghost instrument row */}
                  <div className="absolute top-0 bottom-0 w-[2px] z-[25] pointer-events-none" style={{ left: 0, transform: `translateX(${playheadPos}px)`, background: isPlaying ? 'rgba(240,230,220,0.85)' : 'rgba(200,149,108,0.4)', transition: isPlaying ? `transform ${tickDuration}s linear` : 'none', willChange: isPlaying ? 'transform' : 'auto' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeToCol(time: string | undefined | null): number {
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':').map(Number);
  return ((parts[0] || 0) * 4 + (parts[1] || 0)) * SUBDIVISIONS + (parts[2] || 0);
}

function colToTime(col: number): string {
  const sub = col % SUBDIVISIONS;
  const beat = Math.floor(col / SUBDIVISIONS) % 4;
  const measure = Math.floor(col / (SUBDIVISIONS * 4));
  return `${measure}:${beat}:${sub}`;
}

function durationToWidth(duration: string | undefined | null): number {
  if (!duration) return SUBDIVISIONS;
  const map: Record<string, number> = {
    '1n': SUBDIVISIONS * 4, '2n': SUBDIVISIONS * 2, '2n.': SUBDIVISIONS * 3,
    '4n': SUBDIVISIONS, '4n.': SUBDIVISIONS * 1.5,
    '8n': SUBDIVISIONS / 2, '8n.': SUBDIVISIONS * 0.75,
    '16n': 1, '32n': 0.5,
  };
  return Math.max(1, map[duration] || SUBDIVISIONS);
}
