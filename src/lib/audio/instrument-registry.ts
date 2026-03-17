import * as Tone from 'tone';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInstrument = any;

/** Shared effect buses — one reverb + one delay for ALL tracks instead of per-track.
 *  In the audio engine these are Freeverb/FeedbackDelay nodes; instruments connect via Gain sends. */
export interface SharedEffects {
  reverb: Tone.Freeverb | Tone.Gain;
  delay: Tone.FeedbackDelay | Tone.Gain;
}

export interface InstrumentConfig {
  name: string;
  type: string;
  icon: string;
  create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
    instrument: AnyInstrument;
    reverb: any;
    delay: any;
  };
}

/** Build audio chain. Two modes:
 *  OPTIMIZED (sharedFx): synth → volume → destination (dry), volume → Gain sends → shared buses
 *  LEGACY (no sharedFx): synth → volume → delay → reverb → destination (for offline export) */
function createWithEffects(synth: AnyInstrument, volumeNode: Tone.Volume, sharedFx?: SharedEffects) {
  if (sharedFx) {
    // OPTIMIZED: shared effect buses — lightweight Gain sends instead of per-track Freeverb/Delay
    const reverbSend = new Tone.Gain(0);
    const delaySend = new Tone.Gain(0);
    synth.connect(volumeNode);
    volumeNode.toDestination();
    volumeNode.connect(reverbSend);
    volumeNode.connect(delaySend);
    reverbSend.connect(sharedFx.reverb);
    delaySend.connect(sharedFx.delay);
    return { instrument: synth, reverb: reverbSend, delay: delaySend };
  }
  // LEGACY: per-track effects (offline export only)
  const reverb = new Tone.Freeverb({ dampening: 3000, roomSize: 0.7, wet: 0 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0 }).connect(reverb);
  volumeNode.connect(delay);
  synth.connect(volumeNode);
  return { instrument: synth, reverb, delay };
}

export const instrumentRegistry: Record<string, InstrumentConfig> = {
  piano: {
    name: 'Piano',
    type: 'piano',
    icon: 'P',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 1.2 },
        volume: -6,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  guitar: {
    name: 'Guitar',
    type: 'guitar',
    icon: 'G',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.01,
        modulationIndex: 2,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.8 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  bass: {
    name: 'Bass',
    type: 'bass',
    icon: 'B',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 },
        filterEnvelope: {
          attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3,
          baseFrequency: 80, octaves: 2.5,
        },
        volume: -4,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  synth: {
    name: 'Synth Pad',
    type: 'synth',
    icon: 'S',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 2 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.3, decay: 0.1, sustain: 0.8, release: 1 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  organ: {
    name: 'Organ',
    type: 'organ',
    icon: 'O',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.4 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  strings: {
    name: 'Strings',
    type: 'strings',
    icon: 'St',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 0.5,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.5 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 0.7, release: 1 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  trumpet: {
    name: 'Trumpet',
    type: 'trumpet',
    icon: 'Tr',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 4,
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.3 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.3 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  flute: {
    name: 'Flute',
    type: 'flute',
    icon: 'Fl',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.1, decay: 0.1, sustain: 0.7, release: 0.5 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  marimba: {
    name: 'Marimba',
    type: 'marimba',
    icon: 'Ma',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.5 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  pluck: {
    name: 'Pluck',
    type: 'pluck',
    icon: 'Pk',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 5,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0.05, release: 0.3 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  vocals: {
    name: 'Vocals',
    type: 'vocals',
    icon: 'V',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      // Synth-based choir/vocal — slow-attack AM synthesis mimics voice onset
      // Uses createWithEffects so the signal chain is identical to all other instruments
      const synth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.28, decay: 0.15, sustain: 0.75, release: 1.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 0.65, release: 1.8 },
        volume: -7,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  sax: {
    name: 'Saxophone',
    type: 'sax',
    icon: 'Sx',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 3, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.4 },
        filterEnvelope: {
          attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.4,
          baseFrequency: 300, octaves: 3,
        },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  violin: {
    name: 'Violin',
    type: 'violin',
    icon: 'Vn',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 1, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.8 },
        filterEnvelope: {
          attack: 0.2, decay: 0.1, sustain: 0.7, release: 0.8,
          baseFrequency: 500, octaves: 2,
        },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  cello: {
    name: 'Cello',
    type: 'cello',
    icon: 'Vc',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 1, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.0 },
        filterEnvelope: {
          attack: 0.25, decay: 0.2, sustain: 0.6, release: 1.0,
          baseFrequency: 200, octaves: 2,
        },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  harp: {
    name: 'Harp',
    type: 'harp',
    icon: 'Hp',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 5,
        modulationIndex: 2,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 1.2 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  clarinet: {
    name: 'Clarinet',
    type: 'clarinet',
    icon: 'Cl',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        filter: { Q: 2, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.08, decay: 0.15, sustain: 0.7, release: 0.4 },
        filterEnvelope: {
          attack: 0.1, decay: 0.15, sustain: 0.6, release: 0.4,
          baseFrequency: 400, octaves: 2.5,
        },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  trombone: {
    name: 'Trombone',
    type: 'trombone',
    icon: 'Tb',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.06, decay: 0.2, sustain: 0.6, release: 0.3 },
        filterEnvelope: {
          attack: 0.07, decay: 0.2, sustain: 0.5, release: 0.3,
          baseFrequency: 200, octaves: 3,
        },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  french_horn: {
    name: 'French Horn',
    type: 'french_horn',
    icon: 'Fh',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 1.5, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.12, decay: 0.3, sustain: 0.7, release: 0.5 },
        filterEnvelope: {
          attack: 0.15, decay: 0.3, sustain: 0.5, release: 0.5,
          baseFrequency: 250, octaves: 2.5,
        },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  tuba: {
    name: 'Tuba',
    type: 'tuba',
    icon: 'Tu',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4 },
        filterEnvelope: {
          attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.4,
          baseFrequency: 80, octaves: 2,
        },
        volume: -6,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  oboe: {
    name: 'Oboe',
    type: 'oboe',
    icon: 'Ob',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'triangle' },
        filter: { Q: 3, type: 'bandpass', rolloff: -12 },
        envelope: { attack: 0.06, decay: 0.15, sustain: 0.7, release: 0.3 },
        filterEnvelope: {
          attack: 0.08, decay: 0.15, sustain: 0.6, release: 0.3,
          baseFrequency: 600, octaves: 2,
        },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  harmonica: {
    name: 'Harmonica',
    type: 'harmonica',
    icon: 'Hm',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        filter: { Q: 4, type: 'bandpass', rolloff: -12 },
        envelope: { attack: 0.04, decay: 0.1, sustain: 0.7, release: 0.3 },
        filterEnvelope: {
          attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.3,
          baseFrequency: 500, octaves: 2,
        },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  banjo: {
    name: 'Banjo',
    type: 'banjo',
    icon: 'Bj',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 6,
        modulationIndex: 8,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.25 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  ukulele: {
    name: 'Ukulele',
    type: 'ukulele',
    icon: 'Uk',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 3,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0.08, release: 0.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  sitar: {
    name: 'Sitar',
    type: 'sitar',
    icon: 'Si',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 7,
        modulationIndex: 12,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.8 },
        modulation: { type: 'sawtooth' },
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.05, release: 0.5 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  steel_drums: {
    name: 'Steel Drums',
    type: 'steel_drums',
    icon: 'Sd',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.6 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  xylophone: {
    name: 'Xylophone',
    type: 'xylophone',
    icon: 'Xy',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 5.07,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  vibraphone: {
    name: 'Vibraphone',
    type: 'vibraphone',
    icon: 'Vb',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.6, sustain: 0.15, release: 1.5 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.8 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  accordion: {
    name: 'Accordion',
    type: 'accordion',
    icon: 'Ac',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  electric_piano: {
    name: 'Electric Piano',
    type: 'electric_piano',
    icon: 'EP',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 1.0 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 0.5 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  kalimba: {
    name: 'Kalimba',
    type: 'kalimba',
    icon: 'Ka',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 6,
        modulationIndex: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.05, release: 1.0 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
        volume: -8,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
  celesta: {
    name: 'Celesta',
    type: 'celesta',
    icon: 'Ce',
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.5, sustain: 0.08, release: 1.2 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.4 },
        volume: -10,
      });
      return createWithEffects(synth, volumeNode, sharedFx);
    },
  },
};

// ---------------------------------------------------------------------------
// Dynamic instrument factory — creates a reasonable synth for any instrument
// name not in the registry, based on keyword heuristics.
// ---------------------------------------------------------------------------

function generateIcon(name: string): string {
  const words = name.replace(/_/g, ' ').split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).replace(/^(.)/, (c) => c.toUpperCase());
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function createDynamicInstrument(name: string): InstrumentConfig {
  const lower = name.toLowerCase();

  const config: InstrumentConfig = {
    name: formatName(name),
    type: name,
    icon: generateIcon(name),
    create: (volumeNode: Tone.Volume, sharedFx?: SharedEffects) => createWithEffects(buildSynthForName(lower), volumeNode, sharedFx),
  };
  return config;
}

function buildSynthForName(name: string): AnyInstrument {
  // 808 / Sub bass — deep sine-based sub with long sustain
  if (/808|sub/.test(name)) {
    return new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      filter: { Q: 1, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.9, release: 0.8 },
      filterEnvelope: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.5, baseFrequency: 40, octaves: 1.5 },
      volume: -2,
    });
  }

  // Synth bass / general bass — brighter, more harmonics
  if (/bass|tuba|contrabass|low/.test(name)) {
    return new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3, baseFrequency: 80, octaves: 2.5 },
      volume: -4,
    });
  }

  // Pad / atmospheric / sustained
  if (/pad|ambient|atmosphere|drone|choir|texture|sweep|warm|lush|ethereal|celestial|shimmer/.test(name)) {
    return new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 2 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.3, decay: 0.1, sustain: 0.8, release: 1 },
      volume: -10,
    });
  }

  // Brass
  if (/brass|trumpet|horn|trombone|cornet|euphonium|bugle|flugelhorn/.test(name)) {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1,
      modulationIndex: 4,
      oscillator: { type: 'square' },
      envelope: { attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.3 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.3 },
      volume: -10,
    });
  }

  // Woodwind
  if (/flute|clarinet|oboe|bassoon|piccolo|recorder|fife|whistle|pipe|wind|reed/.test(name)) {
    return new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      filter: { Q: 2, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.08, decay: 0.15, sustain: 0.7, release: 0.4 },
      filterEnvelope: { attack: 0.1, decay: 0.15, sustain: 0.6, release: 0.4, baseFrequency: 400, octaves: 2.5 },
      volume: -10,
    });
  }

  // Bowed strings
  if (/violin|viola|cello|fiddle|erhu|bowed|string/.test(name)) {
    return new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 1, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.8 },
      filterEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.7, release: 0.8, baseFrequency: 500, octaves: 2 },
      volume: -10,
    });
  }

  // Plucked strings
  if (/guitar|banjo|mandolin|ukulele|lute|oud|koto|sitar|harp|pluck|pick|strum|zither|balalaika|charango/.test(name)) {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 4,
      modulationIndex: 5,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.05, release: 0.3 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -8,
    });
  }

  // Percussive / mallet — reduced harmonicity to prevent harsh high frequencies
  if (/xylophone|marimba|glockenspiel|vibraphone|bell|chime|kalimba|mbira|steel.*drum|mallet|gamelan|gong|triangle/.test(name)) {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.5,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.05, release: 0.8 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
      volume: -12,
    });
  }

  // Organ / keys / sustained keyboard
  if (/organ|accordion|harmonium|melodica|concertina|key/.test(name)) {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      volume: -10,
    });
  }

  // Lead / synth / electronic
  if (/lead|arp|acid|wobble|glitch|synth|saw|square|wave|fm|analog|digital|retro|modular|theremin/.test(name)) {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 3,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.3 },
      volume: -8,
    });
  }

  // Default: a warm, versatile poly synth (piano-like)
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle8' },
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 1.0 },
    volume: -8,
  });
}

/**
 * Get an instrument config by name.
 * Returns the curated config for known instruments, or auto-generates one.
 * Generated configs are cached so repeated calls return the same config.
 */
export function getInstrumentConfig(name: string): InstrumentConfig {
  if (instrumentRegistry[name]) return instrumentRegistry[name];
  const config = createDynamicInstrument(name);
  instrumentRegistry[name] = config;
  return config;
}
