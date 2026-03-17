export interface Note {
  note: string;
  duration: string;
  time: string;
  velocity?: number;
}

export interface DrumHit {
  drum: 'kick' | 'snare' | 'hihat' | 'tom' | 'cymbal';
  time: string;
  velocity?: number;
}

export interface TrackEffect {
  reverb: number;
  delay: number;
}

export interface Track {
  instrument: InstrumentType;
  volume: number;
  muted: boolean;
  solo: boolean;
  notes?: Note[];
  pattern?: DrumHit[];
  effects?: TrackEffect;
}

export interface Composition {
  title: string;
  bpm: number;
  key: string;
  timeSignature: string;
  swing: number;
  tracks: Track[];
  measures: number;
}

// InstrumentType is open-ended — the AI can output any instrument name.
// Known instruments have dedicated synth configurations; unknown ones get
// auto-synthesized based on name heuristics.
export type InstrumentType = string;

export type Genre = 'lofi' | 'jazz' | 'hiphop' | 'electronic' | 'rock' | 'rnb' | 'ambient' | 'classical';

export interface GenrePreset {
  id: Genre;
  label: string;
  description: string;
  prompt: string;
  icon: string;
}

// Random key picker — ensures variety across generations
function randomKey(keys: string[]): string { return keys[Math.floor(Math.random() * keys.length)]; }
function randomBpm(min: number, max: number): number { return min + Math.floor(Math.random() * (max - min + 1)); }

const MINOR_KEYS = ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Bbm', 'Ebm', 'F#m', 'C#m', 'G#m'];
const MAJOR_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B'];
const ALL_KEYS = [...MINOR_KEYS, ...MAJOR_KEYS];

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'lofi',
    label: 'Lo-Fi',
    description: 'Chill, relaxed beats with warm tones',
    get prompt() {
      const key = randomKey(MINOR_KEYS);
      const bpm = randomBpm(70, 85);
      return `Create a lo-fi hip hop beat. ${bpm} BPM, key of ${key}, swing 0.15. Pick a UNIQUE jazzy 4-bar chord progression using 7ths and 9ths in ${key} (e.g. Dm9-Gmaj7-Cmaj7-Am7). Layers — 1) SUB: bass (warm, mellow — 2-4 notes per bar on root/5th, some passing tones, C1-C2), 2) RHYTHM: drums (boom-bap — kick on 1 and 3, snare on 2 and 4 with ghost hits at low velocity, swung hi-hats on 8ths, nudge some hits slightly off-grid for humanize feel), 3) HARMONY: electric_piano or piano (jazz chord voicings with 2-3 simultaneous notes per chord, rhythmic comping on offbeats — 2-4 stabs per bar), 4) MELODY: kalimba, vibraphone, or music_box (simple melodic phrase 4-6 notes, chord tones with space between — leave room to breathe), 5) ATMOSPHERE: warm_pad (sustained, reverb 0.5+, long notes), 6) TEXTURE: 1-2 extra layers — pluck or celesta with a gentle repeating motif. Use velocity variation 0.3-0.7 (soft genre). Every instrument loops all 4 bars. 4 measures, loopable.`;
    },
    icon: '🎧',
  },
  {
    id: 'jazz',
    label: 'Jazz',
    description: 'Smooth jazz with complex harmonies',
    get prompt() {
      const key = randomKey(MAJOR_KEYS);
      const bpm = randomBpm(110, 130);
      return `Create a jazz composition. ${bpm} BPM, key of ${key}, swing 0.4. Pick a UNIQUE ii-V-I progression with extended voicings (7ths, 9ths, 13ths) in ${key} (e.g. Dm9-G13-Cmaj7-Am11). Layers — 1) BASS: upright_bass or bass (walking bass line — 4 quarter notes per bar, chromatic stepwise between chord tones, root on beat 1, target chord tone on beat 3), 2) RHYTHM: drums (swing feel — ride cymbal on every quarter, kick sparse on 1 and 3, snare ghost notes at velocity 0.2-0.4 on offbeats, cross-stick on 4, hi-hat on 2 and 4), 3) HARMONY: piano (rhythmic comping — 2-3 note chord voicings on offbeats, NOT on every beat, leave space, 2-3 stabs per bar), 4) MELODY: sax, trumpet, or flute (bebop phrasing — mix of 8th notes with longer tones, target chord tones on strong beats, chromatic approaches, 4-8 notes per bar), 5) COLOR: vibraphone or guitar (counter-rhythmic fills, 2-3 hits per bar on different beats than piano), 6) WARMTH: 1-2 extra instruments — strings or muted_trumpet with sustained or answering phrases. Velocity range 0.3-0.9 for dynamic expression. ALL instruments play in ALL bars. 4 measures, loopable.`;
    },
    icon: '🎷',
  },
  {
    id: 'hiphop',
    label: 'Hip-Hop',
    description: 'Hard-hitting beats with punchy drums',
    get prompt() {
      const key = randomKey(MINOR_KEYS);
      const bpm = randomBpm(88, 100);
      return `Create a hip-hop beat. ${bpm} BPM, key of ${key}. Pick a UNIQUE dark minor chord progression in ${key} (e.g. Cm-Ab-Bb-Gm). Layers — 1) SUB: 808_bass or sub_bass (deep sustained notes C1-C2, 2-3 per bar, kick and bass share the same rhythm — kick provides impact, bass provides body), 2) RHYTHM: drums (punchy kick syncopated NOT four-on-floor, crisp snare on 2&4, hi-hats alternating between straight 8ths and triplet rolls, open hat accents — vary the hat pattern each bar for movement), 3) HOOK: bells, pluck, or music_box (the catchy melodic riff — simple 4-6 note motif that repeats, this is what people hum, use C3-C5), 4) HARMONY: electric_piano or piano (dark chord stabs — 2-3 note voicings on offbeats, 2-3 per bar), 5) ATMOSPHERE: ambient_texture or warm_pad (dark, sustained, reverb 0.5+, sets the mood), 6) TEXTURE: 1-2 extras — steel_drums, kalimba, or vocal_chop with a unique counter-rhythm. Velocity: kick/snare 0.8-0.9, ghost hats 0.3-0.5, melody 0.6-0.8. ALL instruments play in ALL 4 bars. 4 measures, loopable.`;
    },
    icon: '🎤',
  },
  {
    id: 'electronic',
    label: 'Electronic',
    description: 'Energetic synth-driven tracks',
    get prompt() {
      const key = randomKey(ALL_KEYS);
      const bpm = randomBpm(124, 132);
      return `Create an electronic dance track. ${bpm} BPM, key of ${key}. Pick a UNIQUE chord progression in ${key} (4 chords, one per bar, e.g. Am-F-C-G). Layers — 1) SUB: synth_bass (pulsing 8th-note pattern on chord roots with syncopation — sidechain feel with lower velocity on kick hits, C1-C2), 2) RHYTHM: drums (four-on-the-floor kick EVERY beat, clap on 2&4, closed hi-hats on every 8th note with open hat on the "and" of beat 4, cymbal crash beat 1 of bar 1), 3) DRIVE: arp_synth (16th-note arpeggios spelling out chord tones — the pattern CHANGES notes when the chord changes, 8-16 notes per bar, C3-C5), 4) HOOK: saw_lead or square_lead (catchy melodic riff — a phrase that rises, falls, and resolves, 4-6 notes per bar with mixed "4n"/"8n"/"2n" durations), 5) SPACE: shimmer_pad or warm_pad (sustained chord voicings, 2-3 notes per chord, reverb 0.5+, creates width), 6) TEXTURE: 2-3 extras — pluck with offbeat accents, retro_synth with counter-melody, acid_lead with a stabby riff (each 2-4 notes per bar on different beats than other instruments). Velocity: kick 0.9, hats 0.4-0.6, lead 0.6-0.8, texture 0.4-0.6. ALL instruments in ALL bars. 4 measures, loopable.`;
    },
    icon: '🎹',
  },
  {
    id: 'rock',
    label: 'Rock',
    description: 'Guitar-driven with strong rhythms',
    get prompt() {
      const key = randomKey(['E', 'A', 'D', 'G', 'C', 'Em', 'Am', 'Dm', 'Bm']);
      const bpm = randomBpm(128, 145);
      return `Create a rock track. ${bpm} BPM, key of ${key}. Pick a UNIQUE power chord or open chord progression in ${key} (e.g. E5-A5-B5-A5). Layers — 1) LOW END: bass (follows guitar root notes, steady 8th notes or syncopated with kick, punchy mid-range E2-E3, 4-8 notes per bar), 2) RHYTHM: drums (driving kick on 1 and 3, snare HARD on 2 and 4, hi-hat straight 8ths, crash cymbal on beat 1 of bar 1, tom fill in bar 4), 3) CHORDS: guitar (rhythm — power chords alternating with palm mutes, 4-8 hits per bar, accented strums on beats with muted 8ths between), 4) HOOK: lead_guitar (riff or melody — pentatonic-based, 4-8 notes per bar with bends implied by velocity variation 0.5-0.9), 5) BODY: organ or strings (sustained chords underneath, adds thickness, reverb 0.3), 6) ENERGY: 1-2 extras — tambourine on 8ths at low velocity for shimmer, or second guitar with a different voicing. Velocity: drums 0.7-0.9 (loud and proud), everything else 0.5-0.8. ALL instruments ALL bars. 4 measures, loopable.`;
    },
    icon: '🎸',
  },
  {
    id: 'rnb',
    label: 'R&B',
    description: 'Soulful grooves with smooth vibes',
    get prompt() {
      const key = randomKey(MAJOR_KEYS);
      const bpm = randomBpm(68, 80);
      return `Create an R&B groove. ${bpm} BPM, key of ${key}, swing 0.12. Pick a UNIQUE neo-soul chord progression with 9ths and 11ths in ${key} (e.g. Ebmaj9-Cm7-Fm9-Bb7). Layers — 1) LOW END: bass (warm and melodic — not just root notes, use chord tones with passing tones and slides, 2-4 notes per bar, bass is a melodic voice in R&B, C1-C3), 2) GROOVE: drums (bouncy — soft kick, snare with ghost notes at 0.2-0.3 velocity on offbeats, closed hi-hat on accents + open hi-hat that closes on snare, keep it relaxed and behind-the-beat feeling), 3) HARMONY: electric_piano (rich neo-soul voicings — 3-4 simultaneous notes per chord using 9ths/11ths/13ths, rhythmic comping on offbeats NOT every beat, 2-3 stabs per bar leaving space), 4) MELODY: sax, flute, or vocal-like synth (soulful phrasing — mix of longer held notes and quick ornamental runs, 3-5 notes per bar, emotional and expressive with velocity 0.5-0.9), 5) WARMTH: warm_pad or string_pad (lush sustained chords, reverb 0.5+, fills the space), 6) SHIMMER: 1-2 extras — harp arpeggios, vibraphone accents, or guitar with gentle fingerpicking pattern. Velocity variation is key: soft ghost notes 0.2-0.4, accents 0.7-0.9. ALL instruments ALL bars. 4 measures, loopable.`;
    },
    icon: '🎵',
  },
  {
    id: 'ambient',
    label: 'Ambient',
    description: 'Atmospheric and ethereal soundscapes',
    get prompt() {
      const key = randomKey(MAJOR_KEYS);
      const bpm = randomBpm(58, 68);
      return `Create an ambient soundscape. ${bpm} BPM, key of ${key}. Use slow-moving harmony — one chord per 2 bars with maj7 or sus chords in ${key} (e.g. Dmaj7-Gadd9). Layers — 1) FOUNDATION: sub_bass (deep drone holding root note, C1-C2, whole notes, reverb 0.3), 2) BED: celestial_pad and shimmer_pad (two different pads playing sustained chord tones, whole notes, reverb 0.6+, delay 0.2 — these are the core of the sound), 3) DETAIL: piano (sparse melodic notes — wide intervals like 5ths and octaves, 2-3 notes per bar with space between, reverb 0.6+, velocity 0.3-0.5), 4) TEXTURE: glass_harp or crystal_bells (gentle high-register accents, 1-2 notes per bar, reverb 0.7, like distant chimes), 5) MOVEMENT: harp or strings (slow arpeggiated figures, 2-3 notes per bar creating gentle motion), 6) EARTH: tongue_drum or soft cymbal swells (minimal rhythmic pulse, 1-2 hits per bar, very soft 0.2-0.3 velocity). Everything has heavy reverb (0.4-0.7) and delay (0.1-0.3). Ambient is about TEXTURE and SPACE — every instrument present in every bar but with room to breathe. 4 measures, loopable.`;
    },
    icon: '🌙',
  },
  {
    id: 'classical',
    label: 'Classical',
    description: 'Elegant piano-driven compositions',
    get prompt() {
      const key = randomKey(ALL_KEYS);
      const bpm = randomBpm(96, 112);
      return `Create a classical piece. ${bpm} BPM, key of ${key}. Pick a UNIQUE functional harmony progression (I-IV-V-I or i-iv-V-i) in ${key}. Layers — 1) BASS VOICE: cello (chord tones and bass movement, 2-4 notes per bar, arpeggiated or sustained, C2-A3), 2) INNER VOICE: viola (counter-melody or harmonic filler, 3-4 notes per bar, moves when other voices hold), 3) MELODY: violin (expressive main melody — phrases that rise and fall, 4-6 notes per bar with dramatic velocity variation 0.3-0.9, leaps and steps), 4) ACCOMPANIMENT: piano (arpeggiated chords in the left hand 4-8 notes per bar, melodic doubling or fills in the right hand), 5) COLOR: flute, clarinet, or oboe (ornamental figures, trills, answers to the violin melody, 2-4 notes per bar), 6) DEPTH: harp (gentle arpeggiated chord figures, 3-4 notes per bar, adds shimmer and width, reverb 0.3). Use counterpoint — when one voice moves, another holds. Dynamic contrast: some notes at 0.3 (pianissimo), others at 0.9 (fortissimo). NO drums. ALL instruments in ALL bars. 4 measures, loopable.`;
    },
    icon: '🎻',
  },
];

const KNOWN_COLORS: Record<string, string> = {
  piano: '#c8956c',
  guitar: '#e8c5a0',
  bass: '#7a4a6b',
  drums: '#d4845a',
  synth: '#9b6b8a',
  organ: '#b8856c',
  strings: '#a07858',
  trumpet: '#d4a574',
  flute: '#c4a88a',
  marimba: '#8a6a5a',
  pluck: '#b09878',
  vocals: '#c47a9a',
  sax: '#d4a04a',
  violin: '#b07858',
  cello: '#8a5a4a',
  harp: '#c8b878',
  clarinet: '#7a8a6a',
  trombone: '#c8844a',
  french_horn: '#b8944a',
  tuba: '#9a7a4a',
  oboe: '#8aaa7a',
  harmonica: '#6a8a9a',
  banjo: '#d4b474',
  ukulele: '#e8c874',
  sitar: '#c89a5a',
  steel_drums: '#5aa4b4',
  xylophone: '#b47a8a',
  vibraphone: '#7a9ab4',
  accordion: '#a46a6a',
  electric_piano: '#9a8ac4',
  kalimba: '#b89a6a',
  celesta: '#8aaac4',
};

/** Deterministic warm-toned color from instrument name */
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  const hue = ((h % 360) + 360) % 360;
  // Keep saturation and lightness in a warm, muted range that fits the coffee theme
  const sat = 35 + (Math.abs(h >> 8) % 30);   // 35-65%
  const lit = 45 + (Math.abs(h >> 16) % 20);   // 45-65%
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

/** Get color for any instrument — known instruments use curated colors, unknown get auto-generated */
export function getInstrumentColor(instrument: string): string {
  return KNOWN_COLORS[instrument] || hashColor(instrument);
}

