import * as Tone from 'tone';
import { Composition, Track } from '@/types/composition';
import { getInstrumentConfig, SharedEffects } from './instrument-registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInstrument = any;

// ═══════════════════════════════════════════════════════════
// PERFORMANCE CONSTANTS
// ═══════════════════════════════════════════════════════════
const MAX_POLYPHONY = 8;          // Max voices per PolySynth instrument (supports 5+ note chords)
const MASTER_HEADROOM_DB = -6;    // Master output headroom — balanced for 8-10 track compositions
const LOOKAHEAD_S = 0.08;         // Scheduling lookahead (lower = more responsive, higher = more stable)

interface ActiveInstrument {
  instrument: AnyInstrument;
  reverb?: any;
  delay?: any;
  eq?: Tone.EQ3;
  volume: Tone.Volume;
  parts: Tone.Part[];
  usesSharedFx: boolean;
}

interface DrumKit {
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  hihat: Tone.MetalSynth;
  tom: Tone.MembraneSynth;
  cymbal: Tone.MetalSynth;
  volumes: Record<string, Tone.Volume>;
}

export interface FrequencyBands {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
}

export class AudioEngine {
  private instruments: Map<string, ActiveInstrument> = new Map();
  private drumKit: DrumKit | null = null;
  private drumParts: Tone.Part[] = [];
  private composition: Composition | null = null;
  private _needsReload = false;
  private onBeatCallback: ((beat: number) => void) | null = null;
  private beatLoop: Tone.Loop | null = null;

  // Shared effect buses — ONE reverb + ONE delay for ALL tracks
  private sharedReverb: Tone.Freeverb | null = null;
  private sharedDelay: Tone.FeedbackDelay | null = null;

  // Audio analysis for visualizer
  private fft: Tone.FFT | null = null;
  private waveform: Tone.Waveform | null = null;

  async init() {
    // Optimize audio context for playback stability
    try {
      const ctx = Tone.getContext();
      ctx.lookAhead = LOOKAHEAD_S;
    } catch {}

    await Tone.start();

    // Master headroom to prevent clipping with many simultaneous tracks
    Tone.getDestination().volume.value = MASTER_HEADROOM_DB;

    // Create analysers (reduced FFT size for performance)
    if (!this.fft) {
      this.fft = new Tone.FFT(128);
      Tone.getDestination().connect(this.fft);
    }
    if (!this.waveform) {
      this.waveform = new Tone.Waveform(128);
      Tone.getDestination().connect(this.waveform);
    }
  }

  getFFT(): Float32Array {
    if (!this.fft) return new Float32Array(64);
    return this.fft.getValue() as Float32Array;
  }

  getWaveform(): Float32Array {
    if (!this.waveform) return new Float32Array(128);
    return this.waveform.getValue() as Float32Array;
  }

  getFrequencyBands(): FrequencyBands {
    const fftData = this.getFFT();
    if (!fftData || fftData.length === 0) return { bass: 0, mid: 0, treble: 0, energy: 0 };

    const len = fftData.length;
    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);

    let bassSum = 0, midSum = 0, trebleSum = 0;
    for (let i = 0; i < len; i++) {
      const val = Math.max(0, (fftData[i] + 100) / 100);
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else trebleSum += val;
    }

    const bass = Math.min(1, bassSum / Math.max(1, bassEnd));
    const mid = Math.min(1, midSum / Math.max(1, midEnd - bassEnd));
    const treble = Math.min(1, trebleSum / Math.max(1, len - midEnd));
    const energy = Math.min(1, (bass * 0.5 + mid * 0.3 + treble * 0.2));

    return { bass, mid, treble, energy };
  }

  setOnBeat(callback: (beat: number) => void) {
    this.onBeatCallback = callback;
  }

  loadComposition(composition: Composition) {
    try {
      const transport = Tone.getTransport();
      if (transport.state === 'started') transport.stop();
      transport.position = 0;
    } catch {}

    this.dispose();
    this.composition = composition;

    const transport = Tone.getTransport();
    transport.bpm.value = composition.bpm;
    transport.swing = composition.swing || 0;
    transport.swingSubdivision = '8n';

    transport.loopEnd = `${composition.measures}:0:0`;
    transport.loop = true;

    // Beat tracking at 16th note resolution
    this.beatLoop = new Tone.Loop((time) => {
      const position = transport.position;
      if (typeof position === 'string') {
        const parts = position.split(':').map(Number);
        const measure = parts[0] || 0;
        const beat = parts[1] || 0;
        const sixteenth = parts[2] || 0;
        const currentBeat = measure * 4 + beat + sixteenth / 4;
        if (this.onBeatCallback) {
          Tone.getDraw().schedule(() => {
            this.onBeatCallback!(currentBeat);
          }, time);
        }
      }
    }, '16n');
    this.beatLoop.start(0);

    // ── CREATE SHARED EFFECT BUSES ──
    // ONE Freeverb + ONE FeedbackDelay for ALL tracks
    // wet: 1 because send gains control the amount (not wet/dry crossfade)
    this.sharedReverb = new Tone.Freeverb({
      dampening: 3000,
      roomSize: 0.65,
      wet: 1,
    }).toDestination();

    this.sharedDelay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.18,
      wet: 1,
    }).connect(this.sharedReverb);

    // ── CREATE INSTRUMENTS ──
    for (let i = 0; i < composition.tracks.length; i++) {
      const track = composition.tracks[i];
      if (track.instrument === 'drums') {
        this.createDrumKit(track, i);
      } else {
        this.createInstrument(track, i);
      }
    }
  }

  private createDrumKit(track: Track, trackIndex: number) {
    const key = `drums_${trackIndex}`;
    const masterVol = new Tone.Volume(Tone.gainToDb(track.volume)).toDestination();

    const kickVol = new Tone.Volume(0).connect(masterVol);
    const snareVol = new Tone.Volume(0).connect(masterVol);
    const hihatVol = new Tone.Volume(0).connect(masterVol);
    const tomVol = new Tone.Volume(0).connect(masterVol);
    const cymbalVol = new Tone.Volume(0).connect(masterVol);

    this.drumKit = {
      kick: new Tone.MembraneSynth({
        pitchDecay: 0.07,
        octaves: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 1.0 },
        volume: -2,
      }).connect(kickVol),
      snare: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 },
        volume: -6,
      }).connect(snareVol),
      hihat: new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.06, release: 0.04 },
        harmonicity: 5,
        modulationIndex: 24,
        octaves: 1.5,
        volume: -10,
      }).connect(hihatVol),
      tom: new Tone.MembraneSynth({
        pitchDecay: 0.03,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.8 },
        volume: -6,
      }).connect(tomVol),
      cymbal: new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.6, release: 0.3 },
        harmonicity: 5,
        modulationIndex: 20,
        octaves: 1.5,
        volume: -12,
      }).connect(cymbalVol),
      volumes: { kick: kickVol, snare: snareVol, hihat: hihatVol, tom: tomVol, cymbal: cymbalVol },
    };

    if (track.pattern && track.pattern.length > 0) {
      // Sort and deduplicate drum hits to prevent Tone.Part ordering errors
      const safeDrumHits = [...track.pattern]
        .sort((a, b) => timeToSeconds(a.time, this.composition!.bpm) - timeToSeconds(b.time, this.composition!.bpm))
        .filter((p, i, arr) => i === 0 || `${p.time}_${p.drum}` !== `${arr[i-1].time}_${arr[i-1].drum}`);

      const part = new Tone.Part((time, event: { drum: string; velocity?: number }) => {
        if (track.muted) return;
        const vel = event.velocity ?? 0.8;
        switch (event.drum) {
          case 'kick':
            this.drumKit!.kick.triggerAttackRelease('C1', '8n', time, vel);
            break;
          case 'snare':
            this.drumKit!.snare.triggerAttackRelease('8n', time, vel);
            break;
          case 'hihat':
            this.drumKit!.hihat.triggerAttackRelease('32n', time, vel * 0.5);
            break;
          case 'tom':
            this.drumKit!.tom.triggerAttackRelease('G2', '8n', time, vel);
            break;
          case 'cymbal':
            this.drumKit!.cymbal.triggerAttackRelease('16n', time, vel * 0.5);
            break;
        }
      }, safeDrumHits.map((p) => ({ time: p.time, drum: p.drum, velocity: p.velocity })));

      part.loop = true;
      part.loopEnd = `${this.composition!.measures}:0:0`;
      part.start(0);
      this.drumParts.push(part);
    }

    this.instruments.set(key, {
      instrument: this.drumKit.kick,
      volume: masterVol,
      parts: [],
      usesSharedFx: false,
    });
  }

  private createInstrument(track: Track, trackIndex: number) {
    const key = `${track.instrument}_${trackIndex}`;
    const entry = getInstrumentConfig(track.instrument);

    const safeVol = Math.max(0.001, track.volume ?? 0.7);
    const volume = new Tone.Volume(Tone.gainToDb(safeVol));
    volume.mute = track.muted ?? false;

    // Use shared effect buses for massive performance gain
    const sharedFx: SharedEffects | undefined =
      this.sharedReverb && this.sharedDelay
        ? { reverb: this.sharedReverb, delay: this.sharedDelay }
        : undefined;

    const { instrument, reverb, delay, eq } = entry.create(volume, sharedFx);

    // Set effect send levels
    if (sharedFx) {
      // Shared bus mode: reverb/delay are Gain nodes — control via gain.value
      if (reverb?.gain) reverb.gain.value = track.effects?.reverb ?? 0;
      if (delay?.gain) delay.gain.value = track.effects?.delay ?? 0;
    } else {
      // Legacy mode: reverb/delay are effect nodes — control via wet.value
      if (reverb?.wet) reverb.wet.value = track.effects?.reverb ?? 0;
      if (delay?.wet) delay.wet.value = track.effects?.delay ?? 0;
    }

    // ── VOICE LIMITING: cap polyphony to prevent CPU overload ──
    if (instrument.maxPolyphony !== undefined) {
      instrument.maxPolyphony = MAX_POLYPHONY;
    }

    const parts: Tone.Part[] = [];

    // Filter, clamp, deduplicate, and sort notes BEFORE creating the Part
    const seenTimes = new Set<string>();
    const safeNotes = (track.notes || [])
      .map(n => {
        let note = n.note;
        try {
          const freq = Tone.Frequency(note).toFrequency();
          if (freq > 2093) note = Tone.Frequency(Math.min(freq, 2093)).toNote(); // Clamp at C7 instead of C5
        } catch {}
        return { ...n, note };
      })
      .filter(n => {
        // Deduplicate: keep only the first note at each time position
        const key = `${n.time}_${n.note}`;
        if (seenTimes.has(key)) return false;
        seenTimes.add(key);
        return true;
      })
      .sort((a, b) => {
        // Sort by time to satisfy Tone.Part's strictly increasing requirement
        const tA = timeToSeconds(a.time, this.composition!.bpm);
        const tB = timeToSeconds(b.time, this.composition!.bpm);
        return tA - tB;
      });

    if (safeNotes.length > 0) {
      const part = new Tone.Part((time, event: { note: string; duration: string; velocity?: number }) => {
        try {
          instrument.triggerAttackRelease(event.note, event.duration, time, event.velocity ?? 0.7);
        } catch {}
      }, safeNotes.map((n) => ({
        time: n.time,
        note: n.note,
        duration: n.duration,
        velocity: n.velocity,
      })));

      part.loop = true;
      part.loopEnd = `${this.composition!.measures}:0:0`;
      part.start(0);
      parts.push(part);
    }

    this.instruments.set(key, {
      instrument,
      reverb,
      delay,
      eq,
      volume,
      parts,
      usesSharedFx: !!sharedFx,
    });
  }

  /** Call this to ensure next play() reloads the composition (after edits) */
  markDirty() { this._needsReload = true; }

  play(comp?: Composition) {
    // Reload if dirty or if a new composition is provided
    if (comp && comp !== this.composition) {
      this.loadComposition(comp);
    } else if (this._needsReload && this.composition) {
      this.loadComposition(this.composition);
    }
    this._needsReload = false;
    Tone.getTransport().start();
  }

  pause() {
    Tone.getTransport().pause();
    this._silenceAll();
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this._silenceAll();
  }

  /** Release all active voices to stop sound. Simple and clean — no volume manipulation. */
  private _silenceAll() {
    this.instruments.forEach((active) => {
      try {
        const inst = active.instrument;
        if (typeof inst.releaseAll === 'function') inst.releaseAll();
        else if (typeof inst.triggerRelease === 'function') inst.triggerRelease();
      } catch {}
    });

    if (this.drumKit) {
      try { this.drumKit.kick.triggerRelease(); } catch {}
      try { this.drumKit.snare.triggerRelease(); } catch {}
      try { this.drumKit.hihat.triggerRelease(); } catch {}
      try { this.drumKit.tom.triggerRelease(); } catch {}
      try { this.drumKit.cymbal.triggerRelease(); } catch {}
    }
  }

  get isPlaying() {
    return Tone.getTransport().state === 'started';
  }

  get transportState(): string {
    return Tone.getTransport().state;
  }

  setBpm(bpm: number) {
    Tone.getTransport().bpm.value = Math.max(40, Math.min(200, bpm));
  }

  setSwing(swing: number) {
    Tone.getTransport().swing = Math.max(0, Math.min(1, swing));
  }

  private trackKeys(instrument: string): string[] {
    const prefix = `${instrument}_`;
    const results: string[] = [];
    this.instruments.forEach((_, key) => {
      if (key === instrument || key.startsWith(prefix)) results.push(key);
    });
    return results;
  }

  setTrackVolume(instrument: string, vol: number) {
    const db = Tone.gainToDb(Math.max(0, Math.min(1, vol)));
    this.trackKeys(instrument).forEach((key) => {
      this.instruments.get(key)!.volume.volume.value = db;
    });
  }

  setTrackMute(instrument: string, muted: boolean) {
    this.trackKeys(instrument).forEach((key) => {
      this.instruments.get(key)!.volume.mute = muted;
    });
  }

  setTrackSolo(soloInstrument: string, isSolo: boolean) {
    if (isSolo) {
      this.instruments.forEach((inst, key) => {
        const name = key.replace(/_\d+$/, '');
        inst.volume.mute = name !== soloInstrument;
      });
    } else {
      this.instruments.forEach((inst) => { inst.volume.mute = false; });
    }
  }

  setTrackEffect(instrument: string, effect: 'reverb' | 'delay', value: number) {
    const val = Math.max(0, Math.min(1, value));
    this.trackKeys(instrument).forEach((key) => {
      const active = this.instruments.get(key)!;
      const node = effect === 'reverb' ? active.reverb : active.delay;
      if (!node) return;

      if (active.usesSharedFx) {
        // Shared bus mode: node is a Tone.Gain send
        node.gain.value = val;
      } else {
        // Legacy mode: node is Freeverb or FeedbackDelay
        node.wet.value = val;
      }
    });
  }

  /** Set per-track 3-band EQ (low/mid/high in dB, range: -12 to +12) */
  setTrackEQ(instrument: string, band: 'low' | 'mid' | 'high', db: number) {
    const val = Math.max(-12, Math.min(12, db));
    this.trackKeys(instrument).forEach((key) => {
      const active = this.instruments.get(key);
      if (active?.eq) {
        active.eq[band].value = val;
      }
    });
  }

  async exportWav(): Promise<Blob> {
    if (!this.composition) throw new Error('No composition loaded');

    const duration = (this.composition.measures * 4 * 60) / this.composition.bpm;
    const buffer = await Tone.Offline(({ transport }) => {
      transport.bpm.value = this.composition!.bpm;
      transport.swing = this.composition!.swing || 0;

      for (const track of this.composition!.tracks) {
        if (track.muted) continue;

        if (track.instrument === 'drums' && track.pattern) {
          const kick = new Tone.MembraneSynth({ pitchDecay: 0.07, octaves: 8, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 1.0 }, volume: -2 }).toDestination();
          const snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 }, volume: -6 }).toDestination();
          const hihat = new Tone.MetalSynth({ harmonicity: 5, modulationIndex: 24, octaves: 1.5, envelope: { attack: 0.001, decay: 0.06, release: 0.04 }, volume: -10 }).toDestination();
          const tom = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.8 }, volume: -6 }).toDestination();
          const cymbal = new Tone.MetalSynth({ harmonicity: 5, modulationIndex: 20, octaves: 1.5, envelope: { attack: 0.001, decay: 0.6, release: 0.3 }, volume: -12 }).toDestination();

          // Sort and deduplicate drum hits for export
          const safeDrumHits = [...track.pattern]
            .sort((a, b) => timeToSeconds(a.time, this.composition!.bpm) - timeToSeconds(b.time, this.composition!.bpm))
            .filter((p, i, arr) => i === 0 || `${p.time}_${p.drum}` !== `${arr[i-1].time}_${arr[i-1].drum}`);

          const part = new Tone.Part((time, e: { drum: string; velocity?: number }) => {
            const v = e.velocity ?? 0.8;
            if (e.drum === 'kick') kick.triggerAttackRelease('C1', '8n', time, v);
            else if (e.drum === 'snare') snare.triggerAttackRelease('8n', time, v);
            else if (e.drum === 'hihat') hihat.triggerAttackRelease('32n', time, v * 0.5);
            else if (e.drum === 'tom') tom.triggerAttackRelease('G2', '8n', time, v);
            else if (e.drum === 'cymbal') cymbal.triggerAttackRelease('16n', time, v * 0.5);
          }, safeDrumHits.map((p) => ({ time: p.time, drum: p.drum, velocity: p.velocity })));
          part.start(0);
        } else if (track.notes) {
          // Export uses legacy per-track effects (no sharedFx)
          const entry = getInstrumentConfig(track.instrument);
          const vol = new Tone.Volume(Tone.gainToDb(Math.max(0.001, track.volume ?? 0.7)));
          const { instrument, reverb, delay } = entry.create(vol);
          reverb.wet.value = track.effects?.reverb ?? 0;
          delay.wet.value = track.effects?.delay ?? 0;

          // Voice limit for export too
          if (instrument.maxPolyphony !== undefined) {
            instrument.maxPolyphony = MAX_POLYPHONY;
          }

          // Clamp, sort, and deduplicate notes for export
          const seenTimes = new Set<string>();
          const exportNotes = (track.notes || [])
            .map(n => {
              let note = n.note;
              try { const f = Tone.Frequency(note).toFrequency(); if (f > 2093) note = Tone.Frequency(Math.min(f, 2093)).toNote(); } catch {}
              return { ...n, note };
            })
            .filter(n => {
              const key = `${n.time}_${n.note}`;
              if (seenTimes.has(key)) return false;
              seenTimes.add(key);
              return true;
            })
            .sort((a, b) => timeToSeconds(a.time, this.composition!.bpm) - timeToSeconds(b.time, this.composition!.bpm));

          const part = new Tone.Part((time, e: { note: string; duration: string; velocity?: number }) => {
            try { instrument.triggerAttackRelease(e.note, e.duration, time, e.velocity ?? 0.7); } catch {}
          }, exportNotes.map((n) => ({ time: n.time, note: n.note, duration: n.duration, velocity: n.velocity })));
          part.start(0);
        }
      }

      transport.start(0);
    }, duration);

    return bufferToWav(buffer);
  }

  dispose() {
    try { Tone.getTransport().stop(); } catch {}
    try { Tone.getTransport().cancel(); } catch {}

    try { this.beatLoop?.dispose(); } catch {}
    this.beatLoop = null;

    // Dispose non-drum instruments
    this.instruments.forEach((inst, key) => {
      if (key.startsWith('drums_')) return;
      try { inst.parts.forEach((p) => { p.stop(); p.dispose(); }); } catch {}
      try { inst.instrument.disconnect(); inst.instrument.dispose(); } catch {}
      try { inst.reverb?.disconnect(); inst.reverb?.dispose(); } catch {}
      try { inst.delay?.disconnect(); inst.delay?.dispose(); } catch {}
      try { inst.volume.disconnect(); inst.volume.dispose(); } catch {}
    });

    // Dispose drum parts
    this.drumParts.forEach((p) => { try { p.stop(); p.dispose(); } catch {} });
    this.drumParts = [];

    // Dispose drum kit
    if (this.drumKit) {
      try {
        Object.values(this.drumKit.volumes).forEach((v) => { v.disconnect(); v.dispose(); });
      } catch {}
      try { this.drumKit.kick.disconnect(); this.drumKit.kick.dispose(); } catch {}
      try { this.drumKit.snare.disconnect(); this.drumKit.snare.dispose(); } catch {}
      try { this.drumKit.hihat.disconnect(); this.drumKit.hihat.dispose(); } catch {}
      try { this.drumKit.tom.disconnect(); this.drumKit.tom.dispose(); } catch {}
      try { this.drumKit.cymbal.disconnect(); this.drumKit.cymbal.dispose(); } catch {}
      this.drumKit = null;
    }

    // Dispose drum master volumes
    this.instruments.forEach((inst, key) => {
      if (key.startsWith('drums_')) {
        try { inst.volume.disconnect(); inst.volume.dispose(); } catch {}
      }
    });

    this.instruments.clear();

    // Silence shared effects before disposing to kill reverb tail and delay feedback
    if (this.sharedDelay) {
      try { this.sharedDelay.feedback.value = 0; this.sharedDelay.wet.value = 0; } catch {}
      try { this.sharedDelay.disconnect(); this.sharedDelay.dispose(); } catch {}
      this.sharedDelay = null;
    }
    if (this.sharedReverb) {
      try { this.sharedReverb.wet.value = 0; } catch {}
      try { this.sharedReverb.disconnect(); this.sharedReverb.dispose(); } catch {}
      this.sharedReverb = null;
    }

    this.composition = null;
  }

  disposeAnalysers() {
    try { this.fft?.disconnect(); this.fft?.dispose(); } catch {}
    this.fft = null;
    try { this.waveform?.disconnect(); this.waveform?.dispose(); } catch {}
    this.waveform = null;
  }
}

/** Convert "measure:beat:subdivision" time string to seconds at given BPM */
function timeToSeconds(time: string, bpm: number): number {
  const parts = time.split(':').map(Number);
  const measure = parts[0] || 0;
  const beat = parts[1] || 0;
  const sub = parts[2] || 0;
  const totalBeats = measure * 4 + beat + sub / 4;
  return (totalBeats / bpm) * 60;
}

function bufferToWav(buffer: Tone.ToneAudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const dataLength = length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Singleton
let engineInstance: AudioEngine | null = null;

export function getEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
