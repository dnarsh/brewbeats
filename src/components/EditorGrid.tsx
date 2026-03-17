'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store/use-store';
import { getInstrumentColor } from '@/types/composition';
import { getInstrumentConfig } from '@/lib/audio/instrument-registry';
import { getDefaultNote, DRUM_TYPES, EDITOR_CELL_WIDTH, EDITOR_ROW_HEIGHT, EDITOR_DRUM_SUBROW_HEIGHT, EDITOR_LABEL_WIDTH, SUBDIVISIONS, SNAP_TO_SUBDIVISIONS } from '@/lib/editor-constants';
import { NotePopup, NotePopupData } from './NotePopup';

export function EditorGrid() {
  const {
    composition, editorTool, editorSnap,
    selectedTrackIndex, setSelectedTrack,
    addNote, removeNote, addDrumHit, removeDrumHit,
    ghostNotes, ghostInstruments, highlightedNotes, rejectGhostNote, ghostOnlyView, editGhostNote,
  } = useStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const cellWidth = EDITOR_CELL_WIDTH;
  const [popupData, setPopupData] = useState<NotePopupData | null>(null);
  const [expandedTracks, setExpandedTracks] = useState<Set<number>>(new Set());

  // Toggle track expansion (piano roll sub-rows)
  const toggleTrackExpand = useCallback((trackIndex: number) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackIndex)) next.delete(trackIndex); else next.add(trackIndex);
      return next;
    });
  }, []);

  // Scroll handling — horizontal scroll via vertical wheel
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      container.scrollLeft += e.deltaY || e.deltaX;
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);


  // Click handler — tool-aware
  const handleGridClick = useCallback((
    e: React.MouseEvent,
    trackIndex: number,
    isDrum: boolean,
    drumType?: string,
  ) => {
    const state = useStore.getState();
    if (!state.composition || state.isPlaying) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const col = Math.floor(x / cellWidth);
    const snapSize = SNAP_TO_SUBDIVISIONS[state.editorSnap] || 1;
    const snappedCol = Math.floor(col / snapSize) * snapSize;
    const time = colToTime(snappedCol);

    const track = state.composition.tracks[trackIndex];
    if (!track) return;
    const tool = state.editorTool;

    if (isDrum && track.pattern) {
      // Drum track
      const existingIdx = track.pattern.findIndex(h => h.time === time && h.drum === drumType);
      if (tool === 'eraser' || (tool === 'pencil' && existingIdx >= 0)) {
        if (existingIdx >= 0) state.removeDrumHit(trackIndex, existingIdx);
      } else if (tool === 'pencil' && existingIdx < 0 && drumType) {
        state.addDrumHit(trackIndex, { drum: drumType as any, time, velocity: 0.8 });
      }
    } else if (track.notes) {
      // Melodic track
      const existingIdx = track.notes.findIndex(n => n.time === time);
      if (tool === 'eraser') {
        if (existingIdx >= 0) state.removeNote(trackIndex, existingIdx);
      } else if (tool === 'pencil') {
        if (existingIdx >= 0) {
          // Open popup
          setPopupData({ trackIndex, noteIndex: existingIdx, x: e.clientX, y: e.clientY });
        } else {
          state.addNote(trackIndex, {
            note: getDefaultNote(track.instrument),
            duration: state.editorSnap,
            time,
            velocity: 0.7,
          });
        }
      }
    }
  }, [cellWidth]);

  if (!composition) {
    return (
      <div className="flex-1 flex items-center justify-center text-warm-dim">
        <p className="text-sm">No composition loaded. Generate a beat first.</p>
      </div>
    );
  }

  const beatsPerMeasure = parseInt(composition.timeSignature?.split('/')[0]) || 4;
  const totalBeats = composition.measures * beatsPerMeasure;
  const totalCells = totalBeats * SUBDIVISIONS;
  const gridWidth = totalCells * cellWidth;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-auto timeline-scroll" style={{ willChange: 'scroll-position' }}>
        <div style={{ minWidth: gridWidth + EDITOR_LABEL_WIDTH }}>
          {/* Header — beat numbers */}
          <div className="flex border-b border-roast-light sticky top-0 bg-espresso z-10">
            <div
              className="bg-roast border-r border-roast-light px-3 py-2 text-[10px] text-warm-dim uppercase tracking-wider sticky left-0 z-20"
              style={{ width: EDITOR_LABEL_WIDTH, minWidth: EDITOR_LABEL_WIDTH }}
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
            const config = getInstrumentConfig(track.instrument);
            const color = getInstrumentColor(track.instrument);
            const isDrum = track.instrument === 'drums';
            const isSelected = selectedTrackIndex === trackIndex;
            const isExpanded = expandedTracks.has(trackIndex) && !isDrum;
            // Get unique notes in this track for expanded view
            const trackNotes = !isDrum && track.notes ? Array.from(new Set(track.notes.map(n => n.note))).sort((a, b) => {
              try { return noteToMidi(b) - noteToMidi(a); } catch { return 0; } // high to low
            }) : [];
            const expandedNoteRows = isExpanded ? (trackNotes.length > 0 ? trackNotes : [getDefaultNote(track.instrument)]) : [];
            const rowHeight = isDrum ? DRUM_TYPES.length * EDITOR_DRUM_SUBROW_HEIGHT : isExpanded ? Math.max(expandedNoteRows.length, 1) * EDITOR_DRUM_SUBROW_HEIGHT : EDITOR_ROW_HEIGHT;

            return (
              <div
                key={`${track.instrument}-${trackIndex}`}
                className={`flex border-b border-roast-light/40 ${track.muted ? 'opacity-35' : ''}`}
                style={{ height: rowHeight }}
                onClick={() => setSelectedTrack(trackIndex)}
              >
                {/* Label — click to expand note rows */}
                <div
                  className={`bg-roast border-r border-roast-light flex flex-col justify-center px-2 sticky left-0 z-10 cursor-pointer ${
                    isSelected ? 'border-l-[3px] border-l-caramel bg-caramel/[0.04]' : ''
                  }`}
                  style={{ width: EDITOR_LABEL_WIDTH, minWidth: EDITOR_LABEL_WIDTH }}
                  title={`${config.name} — click to ${isExpanded ? 'collapse' : 'expand'} note rows`}
                  onClick={(e) => { e.stopPropagation(); setSelectedTrack(trackIndex); if (!isDrum) toggleTrackExpand(trackIndex); }}
                >
                  {isExpanded ? (
                    // Expanded: show note labels vertically
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[7px] font-bold text-espresso flex-none" style={{ backgroundColor: color }}>{config.icon}</div>
                        <span className="text-[9px] text-cream truncate font-medium">{config.name}</span>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--caramel)" strokeWidth="2" className="flex-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {expandedNoteRows.map(note => (
                        <div key={note} className="text-[8px] text-warm-dim/60 font-mono leading-[28px] truncate" style={{ height: EDITOR_DRUM_SUBROW_HEIGHT }}>
                          {note}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Collapsed: single row
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-espresso flex-none" style={{ backgroundColor: color }}>{config.icon}</div>
                      <span className="text-[10px] text-cream truncate font-medium">{config.name}</span>
                      {!isDrum && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--warm-dim)" strokeWidth="2" className="flex-none ml-auto opacity-40"><polyline points="9 18 15 12 9 6"/></svg>}
                    </div>
                  )}
                </div>

                {/* Grid area */}
                {isDrum ? (
                  // Drum sub-rows
                  <div className="relative" style={{ width: gridWidth }}>
                    {DRUM_TYPES.map((drumType, di) => (
                      <div
                        key={drumType}
                        className="relative cursor-crosshair"
                        style={{
                          height: EDITOR_DRUM_SUBROW_HEIGHT,
                          width: gridWidth,
                          backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${cellWidth}px)`,
                          borderBottom: di < DRUM_TYPES.length - 1 ? '1px solid rgba(58,45,37,0.3)' : 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGridClick(e, trackIndex, true, drumType);
                        }}
                      >
                        {/* Drum label */}
                        <span className="absolute left-1 top-0.5 text-[8px] text-warm-dim/40 pointer-events-none">{drumType}</span>

                        {/* Drum hits */}
                        {track.pattern?.filter(h => h.drum === drumType).map((hit, hi) => {
                          const hitCol = timeToCol(hit.time);
                          return (
                            <div
                              key={`${hit.time}-${hi}`}
                              className="absolute top-1 rounded-sm"
                              style={{
                                left: hitCol * cellWidth + 2,
                                width: cellWidth - 4,
                                height: EDITOR_DRUM_SUBROW_HEIGHT - 8,
                                backgroundColor: color,
                                opacity: hit.velocity ?? 0.8,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : isExpanded ? (
                  // Expanded melodic track — note sub-rows (like piano roll)
                  <div className="relative" style={{ width: gridWidth }}>
                    {expandedNoteRows.map((noteName, ri) => (
                      <div
                        key={noteName}
                        className="relative cursor-crosshair"
                        style={{
                          height: EDITOR_DRUM_SUBROW_HEIGHT,
                          width: gridWidth,
                          backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${cellWidth}px)`,
                          borderBottom: ri < expandedNoteRows.length - 1 ? '1px solid rgba(58,45,37,0.3)' : 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const state = useStore.getState();
                          if (!state.composition || state.isPlaying) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const col = Math.floor((e.clientX - rect.left) / cellWidth);
                          const snapSize = SNAP_TO_SUBDIVISIONS[state.editorSnap] || 1;
                          const snappedCol = Math.floor(col / snapSize) * snapSize;
                          const time = colToTime(snappedCol);
                          const tool = state.editorTool;
                          // Find existing note at this time+pitch
                          const existingIdx = track.notes?.findIndex(n => n.time === time && n.note === noteName) ?? -1;
                          if (tool === 'eraser' || (tool === 'pencil' && existingIdx >= 0)) {
                            if (existingIdx >= 0) state.removeNote(trackIndex, existingIdx);
                          } else if (tool === 'pencil' && existingIdx < 0) {
                            state.addNote(trackIndex, { note: noteName, duration: state.editorSnap, time, velocity: 0.7 });
                          }
                        }}
                      >
                        {/* Notes on this pitch row */}
                        {track.notes?.filter(n => n.note === noteName).map((note, ni) => {
                          const col = timeToCol(note.time);
                          const w = durationToWidth(note.duration);
                          const actualIdx = track.notes!.indexOf(note);
                          return (
                            <div
                              key={`${note.time}-${ni}`}
                              className="absolute top-1 rounded flex items-center justify-center text-[7px] font-semibold text-espresso shadow-sm note-hover-glow cursor-pointer"
                              style={{
                                left: col * cellWidth + 1,
                                width: Math.max(w * cellWidth - 2, cellWidth - 2),
                                height: EDITOR_DRUM_SUBROW_HEIGHT - 8,
                                backgroundColor: color,
                                opacity: note.velocity ?? 0.7,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const state = useStore.getState();
                                if (state.editorTool === 'eraser') { state.removeNote(trackIndex, actualIdx); return; }
                                if (state.editorTool === 'pencil') setPopupData({ trackIndex, noteIndex: actualIdx, x: e.clientX, y: e.clientY });
                              }}
                              title={`${note.note} | ${note.duration} | vel:${(note.velocity ?? 0.7).toFixed(2)}`}
                            >
                              {w >= 1.5 ? note.note : ''}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {/* Playhead */}
                  </div>
                ) : (
                  // Collapsed melodic track — single row
                  <div
                    className="relative cursor-crosshair"
                    style={{
                      width: gridWidth,
                      height: EDITOR_ROW_HEIGHT,
                      backgroundImage: [
                        `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${cellWidth}px)`,
                        `repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS}px)`,
                        `repeating-linear-gradient(90deg, rgba(200,149,108,0.3) 0px, rgba(200,149,108,0.3) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS * beatsPerMeasure}px)`,
                      ].join(', '),
                    }}
                    onClick={(e) => { e.stopPropagation(); handleGridClick(e, trackIndex, false); }}
                  >
                    {track.notes?.map((note, ni) => {
                      const col = timeToCol(note.time);
                      const w = durationToWidth(note.duration);
                      return (
                        <div key={`${note.time}-${note.note}-${ni}`} className={`absolute top-1.5 rounded flex items-center justify-center text-[8px] font-semibold text-espresso shadow-sm ${ghostOnlyView ? '' : 'note-hover-glow'}`} style={{ left: col * cellWidth + 1, width: Math.max(w * cellWidth - 2, cellWidth - 2), height: EDITOR_ROW_HEIGHT - 12, backgroundColor: color, opacity: ghostOnlyView ? 0.15 : (note.velocity ?? 0.7), pointerEvents: ghostOnlyView ? 'none' : 'auto' }} title={`${note.note} | ${note.duration} | vel:${(note.velocity ?? 0.7).toFixed(2)}`}>
                          {w >= 1.5 ? note.note : note.note.replace(/[0-9]/g, '')}
                        </div>
                      );
                    })}

                    {/* Ghost notes — add/modify show in caramel, delete shows in red */}
                    {ghostNotes.filter(g => g.trackIndex === trackIndex && g.status === 'pending').map(gn => {
                      const col = timeToCol(gn.time);
                      const w = durationToWidth(gn.duration);
                      const isGhostView = ghostOnlyView;
                      const isDelete = gn.action === 'delete';
                      const ghostColor = isDelete ? '#e85a5a' : color;
                      return (
                        <div
                          key={`ghost-${gn.id}`}
                          className={`absolute top-1.5 rounded flex items-center justify-center font-semibold cursor-pointer z-10 ${isGhostView ? 'text-[8px] note-hover-glow' : 'text-[7px]'} ${isDelete ? 'text-red-200' : isGhostView ? 'text-espresso' : 'text-cream/70'}`}
                          style={{
                            left: col * cellWidth + 1,
                            width: Math.max(w * cellWidth - 2, cellWidth - 2),
                            height: EDITOR_ROW_HEIGHT - 12,
                            backgroundColor: isGhostView ? ghostColor : `${ghostColor}50`,
                            opacity: isGhostView ? (isDelete ? 0.6 : (gn.velocity || 0.7)) : (isDelete ? 0.5 : 0.4),
                            border: isGhostView ? `2px solid ${ghostColor}` : `2px dashed ${ghostColor}80`,
                            boxShadow: isGhostView ? `0 0 8px ${ghostColor}40` : 'none',
                            textDecoration: isDelete ? 'line-through' : 'none',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editorTool === 'eraser') { rejectGhostNote(gn.id); return; }
                            setPopupData({ trackIndex, noteIndex: -1, x: e.clientX, y: e.clientY });
                          }}
                          title={`AI ${gn.action}: ${gn.note} | ${gn.duration}${isDelete ? ' (marked for deletion)' : ''}`}
                        >
                          {isDelete ? '✕' : ''}{!isDelete && !isGhostView ? '✨' : ''} {gn.note}
                        </div>
                      );
                    })}

                    {/* Highlights on real notes */}
                    {highlightedNotes.filter(h => h.trackIndex === trackIndex).map((h, hi) => {
                      const matchingNote = track.notes?.find(n => n.time === h.time && (!h.note || n.note === h.note));
                      if (!matchingNote) return null;
                      const col = timeToCol(matchingNote.time);
                      const w = durationToWidth(matchingNote.duration);
                      const borderColor = h.color === 'red' ? '#e85a5a' : h.color === 'green' ? '#5ac87a' : '#e8c06c';
                      return (
                        <div
                          key={`hl-${hi}`}
                          className="absolute top-1 rounded pointer-events-none"
                          style={{
                            left: col * cellWidth,
                            width: Math.max(w * cellWidth, cellWidth),
                            height: EDITOR_ROW_HEIGHT - 10,
                            border: `2px solid ${borderColor}`,
                            boxShadow: `0 0 8px ${borderColor}40`,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ghost Instrument Tracks — AI-suggested new instruments */}
          {ghostInstruments.filter(gi => gi.action === 'add' && gi.status === 'pending').map(gi => {
            const giColor = getInstrumentColor(gi.instrument);
            const giConfig = getInstrumentConfig(gi.instrument);
            const giNotes = ghostNotes.filter(g => g.groupId === gi.groupId && g.status === 'pending');

            return (
              <div
                key={`ghost-inst-${gi.id}`}
                className="flex border-b border-dashed border-caramel/20"
                style={{ height: EDITOR_ROW_HEIGHT, opacity: ghostOnlyView ? 1 : 0.6 }}
              >
                {/* Label */}
                <div
                  className="border-r border-roast-light flex items-center px-2 gap-2 sticky left-0 z-10 overflow-hidden"
                  style={{ width: EDITOR_LABEL_WIDTH, minWidth: EDITOR_LABEL_WIDTH, background: ghostOnlyView ? '#2a1f1a' : '#2a1f1a80' }}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[7px] font-bold text-espresso flex-none border-2 border-dashed" style={{ backgroundColor: `${giColor}80`, borderColor: giColor }}>
                    {giConfig.icon}
                  </div>
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-[9px] text-cream/80 truncate font-medium">{giConfig.name}</span>
                    <span className="text-[7px] text-caramel/60">AI</span>
                  </div>
                </div>

                {/* Grid with ghost notes */}
                <div
                  className="relative"
                  style={{
                    width: gridWidth,
                    height: EDITOR_ROW_HEIGHT,
                    backgroundImage: [
                      `repeating-linear-gradient(90deg, rgba(200,149,108,0.02) 0px, rgba(200,149,108,0.02) 1px, transparent 1px, transparent ${cellWidth}px)`,
                      `repeating-linear-gradient(90deg, rgba(200,149,108,0.06) 0px, rgba(200,149,108,0.06) 1px, transparent 1px, transparent ${cellWidth * SUBDIVISIONS}px)`,
                    ].join(', '),
                  }}
                >
                  {giNotes.map(gn => {
                    const col = timeToCol(gn.time);
                    const w = durationToWidth(gn.duration);
                    return (
                      <div
                        key={`gi-note-${gn.id}`}
                        className="absolute top-1.5 rounded flex items-center justify-center text-[8px] font-semibold text-espresso note-hover-glow cursor-pointer"
                        style={{
                          left: col * cellWidth + 1,
                          width: Math.max(w * cellWidth - 2, cellWidth - 2),
                          height: EDITOR_ROW_HEIGHT - 12,
                          backgroundColor: ghostOnlyView ? giColor : `${giColor}70`,
                          border: ghostOnlyView ? `2px solid ${giColor}` : `2px dashed ${giColor}80`,
                          boxShadow: ghostOnlyView ? `0 0 6px ${giColor}40` : 'none',
                          opacity: ghostOnlyView ? (gn.velocity || 0.7) : 0.5,
                        }}
                        title={`AI: ${gn.note} | ${gn.duration}`}
                      >
                        {gn.note}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note popup */}
      <NotePopup data={popupData} onClose={() => setPopupData(null)} />
    </div>
  );
}

// ── Helpers ──

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

function noteToMidi(note: string): number {
  const match = note.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) return 60;
  const names: Record<string, number> = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11 };
  return (parseInt(match[2]) + 1) * 12 + (names[match[1]] ?? 0);
}
