/**
 * MIDI Export — converts BrewBeats compositions to standard .mid files.
 * Uses midi-writer-js to create type-1 MIDI files with multiple tracks.
 * Compatible with any DAW (Ableton, FL Studio, Logic, GarageBand, etc.)
 */

// @ts-expect-error — midi-writer-js types not exported correctly
import MidiWriter from 'midi-writer-js';
import { Composition, Track, Note, DrumHit } from '@/types/composition';

// Map Tone.js durations to MIDI tick durations
const DURATION_MAP: Record<string, string> = {
  '1n': '1',       // whole note
  '2n': '2',       // half note
  '2n.': 'd2',     // dotted half
  '4n': '4',       // quarter
  '4n.': 'd4',     // dotted quarter
  '8n': '8',       // eighth
  '8n.': 'd8',     // dotted eighth
  '16n': '16',     // sixteenth
  '16n.': 'd16',   // dotted sixteenth
  '32n': '32',     // thirty-second
};

// GM drum map (channel 10)
const DRUM_NOTE_MAP: Record<string, string> = {
  kick: 'C2',    // GM kick drum
  snare: 'D2',   // GM snare
  hihat: 'F#2',  // GM closed hi-hat
  tom: 'D3',     // GM high tom
  cymbal: 'C#3', // GM crash cymbal
};

/**
 * Convert a Tone.js time string (e.g., "0:0:0") to MIDI ticks.
 * Format: "measure:beat:sixteenth"
 */
function timeToTicks(timeStr: string, bpm: number): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  const measure = parts[0] || 0;
  const beat = parts[1] || 0;
  const sixteenth = parts[2] || 0;
  // 128 ticks per beat (standard MIDI resolution)
  return (measure * 4 + beat + sixteenth / 4) * 128;
}

function getMidiDuration(duration: string): string {
  return DURATION_MAP[duration] || '8'; // default to eighth note
}

/**
 * Export a BrewBeats composition to a .mid file and trigger download.
 */
export function exportMidi(composition: Composition): void {
  const tracks: MidiWriter.Track[] = [];

  for (const track of composition.tracks) {
    if (track.instrument === 'drums' && track.pattern) {
      tracks.push(createDrumTrack(track, composition));
    } else if (track.notes && track.notes.length > 0) {
      tracks.push(createMelodicTrack(track, composition));
    }
  }

  if (tracks.length === 0) return;

  const writer = new MidiWriter.Writer(tracks);
  const dataUri = writer.dataUri();

  // Trigger download
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = `brewbeats-${composition.title?.replace(/[^a-z0-9]/gi, '-') || 'composition'}-${composition.bpm}bpm.mid`;
  a.click();
}

function createMelodicTrack(track: Track, comp: Composition): MidiWriter.Track {
  const midiTrack = new MidiWriter.Track();
  midiTrack.setTempo(comp.bpm);
  midiTrack.addTrackName(track.instrument);

  // Sort notes by time
  const sorted = [...(track.notes || [])].sort((a, b) =>
    timeToTicks(a.time, comp.bpm) - timeToTicks(b.time, comp.bpm)
  );

  let lastTick = 0;
  for (const note of sorted) {
    const tick = timeToTicks(note.time, comp.bpm);
    const wait = tick - lastTick;

    const event = new MidiWriter.NoteEvent({
      pitch: [note.note],
      duration: getMidiDuration(note.duration),
      velocity: Math.round((note.velocity || 0.7) * 127),
      wait: wait > 0 ? `T${wait}` : '0',
    });

    midiTrack.addEvent(event);
    lastTick = tick;
  }

  return midiTrack;
}

function createDrumTrack(track: Track, comp: Composition): MidiWriter.Track {
  const midiTrack = new MidiWriter.Track();
  midiTrack.setTempo(comp.bpm);
  midiTrack.addTrackName('Drums');
  // Channel 10 for drums (0-indexed = channel 9)
  midiTrack.setChannel(10);

  const sorted = [...(track.pattern || [])].sort((a, b) =>
    timeToTicks(a.time, comp.bpm) - timeToTicks(b.time, comp.bpm)
  );

  let lastTick = 0;
  for (const hit of sorted) {
    const tick = timeToTicks(hit.time, comp.bpm);
    const wait = tick - lastTick;
    const drumNote = DRUM_NOTE_MAP[hit.drum] || 'C2';

    const event = new MidiWriter.NoteEvent({
      pitch: [drumNote],
      duration: '16',
      velocity: Math.round((hit.velocity || 0.8) * 127),
      wait: wait > 0 ? `T${wait}` : '0',
      channel: 10,
    });

    midiTrack.addEvent(event);
    lastTick = tick;
  }

  return midiTrack;
}
