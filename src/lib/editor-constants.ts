export const INSTRUMENT_CATEGORIES: Record<string, string[]> = {
  'Keys': ['piano', 'electric_piano', 'organ', 'harpsichord', 'celesta', 'clavinet', 'melodica'],
  'Bass': ['bass', 'sub_bass', 'synth_bass', '808_bass', 'upright_bass', 'fretless_bass'],
  'Drums': ['drums'],
  'Strings': ['violin', 'viola', 'cello', 'double_bass', 'strings', 'harp'],
  'Brass': ['trumpet', 'trombone', 'french_horn', 'tuba', 'flugelhorn', 'cornet'],
  'Woodwind': ['flute', 'clarinet', 'oboe', 'sax', 'bassoon', 'recorder', 'pan_flute'],
  'Synth / Lead': ['synth', 'saw_lead', 'square_lead', 'arp_synth', 'acid_lead', 'retro_synth'],
  'Pads': ['warm_pad', 'string_pad', 'shimmer_pad', 'celestial_pad', 'ambient_texture'],
  'Percussion': ['marimba', 'xylophone', 'vibraphone', 'kalimba', 'steel_drums', 'glockenspiel'],
  'World': ['sitar', 'koto', 'djembe', 'tabla', 'shakuhachi', 'erhu'],
  'Guitar': ['guitar', 'banjo', 'ukulele', 'mandolin', 'lute'],
};

const KNOWN_DEFAULTS: Record<string, string> = {
  piano:'C4', guitar:'E3', bass:'C2', synth:'C4', organ:'C4', strings:'G4',
  trumpet:'C4', flute:'C5', marimba:'C4', pluck:'E4', vocals:'C4',
  sax:'Bb3', violin:'A4', cello:'C3', harp:'C4', clarinet:'Bb4',
  trombone:'Bb3', french_horn:'F3', tuba:'Bb1', oboe:'C5', harmonica:'C4',
  banjo:'G3', ukulele:'A4', sitar:'C4', steel_drums:'C5', xylophone:'C5',
  vibraphone:'C4', accordion:'C4', electric_piano:'C4', kalimba:'C5', celesta:'C5',
};

export function getDefaultNote(instrument: string): string {
  if (KNOWN_DEFAULTS[instrument]) return KNOWN_DEFAULTS[instrument];
  const name = instrument.toLowerCase();
  if (/bass|sub|808|tuba|contrabass/.test(name)) return 'C2';
  if (/pad|ambient|drone|texture/.test(name)) return 'C3';
  if (/lead|synth|arp|acid|saw|square/.test(name)) return 'C4';
  if (/flute|piccolo|whistle|recorder/.test(name)) return 'C5';
  if (/violin|fiddle/.test(name)) return 'G4';
  if (/cello|viola/.test(name)) return 'C3';
  if (/guitar|banjo|ukulele|mandolin/.test(name)) return 'E3';
  return 'C4';
}

export const DRUM_TYPES = ['kick', 'snare', 'hihat', 'tom', 'cymbal'] as const;

export const SNAP_OPTIONS = [
  { value: '4n' as const, label: '1/4' },
  { value: '8n' as const, label: '1/8' },
  { value: '16n' as const, label: '1/16' },
];

export const SNAP_TO_SUBDIVISIONS: Record<string, number> = { '4n': 4, '8n': 2, '16n': 1 };

// Grid constants (shared between EditorGrid and helpers)
export const EDITOR_CELL_WIDTH = 28;
export const EDITOR_ROW_HEIGHT = 48;
export const EDITOR_DRUM_SUBROW_HEIGHT = 28;
export const EDITOR_LABEL_WIDTH = 120;
export const SUBDIVISIONS = 4;
