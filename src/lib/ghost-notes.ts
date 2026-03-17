import { Composition, Track } from '@/types/composition';
import { GhostNote, GhostInstrument } from '@/types/advisor';

export function getPlayableComposition(
  comp: Composition,
  ghostNotes: GhostNote[],
  ghostInstruments: GhostInstrument[],
  ghostOnlyView: boolean,
): Composition {
  const pending = ghostNotes.filter(g => g.status === 'pending' && g.action !== 'delete');
  const pendingInstruments = ghostInstruments.filter(g => g.status === 'pending' && g.action === 'add');

  if (!ghostOnlyView && pending.length === 0 && pendingInstruments.length === 0) return comp;

  const merged: Composition = JSON.parse(JSON.stringify(comp));
  const newInstrumentGroupIds = new Set(pendingInstruments.map(gi => gi.groupId));

  if (ghostOnlyView) {
    for (const track of merged.tracks) {
      track.notes = [];
      track.pattern = [];
      track.volume = 0;
    }
  }

  // Add ghost notes to EXISTING tracks (skip notes belonging to new instruments)
  for (const ghost of pending) {
    if (newInstrumentGroupIds.has(ghost.groupId)) continue; // belongs to a new instrument — handled below
    const track = merged.tracks[ghost.trackIndex];
    if (!track) continue;
    if (!track.notes) track.notes = [];
    if (ghostOnlyView) track.volume = 0.7;
    track.notes.push({ note: ghost.note, duration: ghost.duration, time: ghost.time, velocity: ghost.velocity });
  }

  // Add ghost instruments as new tracks with their ghost notes
  for (const gi of pendingInstruments) {
    const giNotes = pending.filter(g => g.groupId === gi.groupId);
    const newTrack: Track = {
      instrument: gi.instrument,
      volume: 0.7,
      muted: false,
      solo: false,
      notes: giNotes.map(g => ({ note: g.note, duration: g.duration, time: g.time, velocity: g.velocity })),
      effects: { reverb: 0, delay: 0 },
    };
    merged.tracks.push(newTrack);
  }

  return merged;
}

export function ghostId(): string {
  return 'g_' + Math.random().toString(36).slice(2, 10);
}

export function suggestionId(): string {
  return 'sg_' + Math.random().toString(36).slice(2, 10);
}
