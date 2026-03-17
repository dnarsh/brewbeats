import { Composition, Track } from '@/types/composition';

// ═══════════════════════════════════════════════════════════════
//  PATCH MODE — apply incremental changes to existing composition
// ═══════════════════════════════════════════════════════════════

export interface CompositionPatch {
  _patch: true;
  set?: Partial<Pick<Composition, 'bpm' | 'key' | 'measures' | 'swing' | 'title' | 'timeSignature'>>;
  addTracks?: Track[];
  removeTracks?: string[];
  replaceTracks?: Record<string, Partial<Track>>;
}

/** Apply a patch to an existing composition, returning a new composition */
export function applyPatch(base: Composition, patch: CompositionPatch): Composition {
  const result = { ...base };

  // Apply top-level field changes
  if (patch.set) {
    if (patch.set.bpm !== undefined) result.bpm = Math.max(40, Math.min(200, patch.set.bpm));
    if (patch.set.key !== undefined) result.key = patch.set.key;
    if (patch.set.measures !== undefined) result.measures = Math.max(1, Math.min(128, patch.set.measures));
    if (patch.set.swing !== undefined) result.swing = Math.max(0, Math.min(1, patch.set.swing));
    if (patch.set.title !== undefined) result.title = patch.set.title;
    if (patch.set.timeSignature !== undefined) result.timeSignature = patch.set.timeSignature;
  }

  // Start with existing tracks
  let tracks = [...result.tracks];

  // Remove tracks by instrument name
  if (patch.removeTracks && patch.removeTracks.length > 0) {
    const removeSet = new Set(patch.removeTracks.map(n => n.toLowerCase()));
    tracks = tracks.filter(t => !removeSet.has(t.instrument.toLowerCase()));
  }

  // Replace tracks by instrument name (updates matching tracks in-place)
  if (patch.replaceTracks) {
    for (const [instrumentName, updates] of Object.entries(patch.replaceTracks)) {
      const lower = instrumentName.toLowerCase();
      tracks = tracks.map(t => {
        if (t.instrument.toLowerCase() !== lower) return t;
        return {
          ...t,
          ...updates,
          instrument: t.instrument, // keep original name
          effects: {
            reverb: updates.effects?.reverb ?? t.effects?.reverb ?? 0,
            delay: updates.effects?.delay ?? t.effects?.delay ?? 0,
          },
        };
      });
    }
  }

  // Add new tracks
  if (patch.addTracks && patch.addTracks.length > 0) {
    for (const newTrack of patch.addTracks) {
      tracks.push({
        instrument: newTrack.instrument,
        volume: Math.max(0, Math.min(1, newTrack.volume ?? 0.7)),
        muted: newTrack.muted ?? false,
        solo: newTrack.solo ?? false,
        effects: {
          reverb: Math.max(0, Math.min(1, newTrack.effects?.reverb ?? 0)),
          delay: Math.max(0, Math.min(1, newTrack.effects?.delay ?? 0)),
        },
        notes: newTrack.notes || [],
        pattern: newTrack.pattern || [],
      });
    }
  }

  // Normalize drum tracks
  result.tracks = normalizeDrumTracks(tracks);
  return result;
}

/** Extract the outermost balanced JSON object starting from a given index */
function extractBalancedObject(text: string, startIdx: number): string | null {
  if (text[startIdx] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  // Unclosed — try repair
  return null;
}

/** Parse a patch object from JSON text */
export function parsePatch(content: string): CompositionPatch | null {
  // Try fenced JSON first
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : content;

  // Find "_patch" keyword and walk back to the opening brace
  const patchIdx = raw.indexOf('"_patch"');
  if (patchIdx < 0) return null;

  // Find the opening '{' that contains "_patch"
  let braceIdx = raw.lastIndexOf('{', patchIdx);
  if (braceIdx < 0) return null;

  // Extract the balanced JSON object starting from that brace
  let jsonStr = extractBalancedObject(raw, braceIdx);

  if (jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      if (obj._patch === true) return obj as CompositionPatch;
    } catch { /* try repair below */ }
  }

  // If balanced extraction failed, grab from brace to end and repair
  jsonStr = raw.slice(braceIdx);
  const repaired = repairTruncatedJson(jsonStr);
  if (repaired) {
    try {
      const obj = JSON.parse(repaired);
      if (obj._patch === true) return obj as CompositionPatch;
    } catch {}
  }

  return null;
}

/** Strip <think> / <reasoning> blocks, including incomplete ones during streaming */
export function stripThinkingTags(content: string): string {
  // Remove complete blocks
  let result = content
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '');
  // If there's an unclosed <think>, strip everything from it onward
  const thinkIdx = result.indexOf('<think>');
  if (thinkIdx >= 0) result = result.slice(0, thinkIdx);
  const reasonIdx = result.indexOf('<reasoning>');
  if (reasonIdx >= 0) result = result.slice(0, reasonIdx);
  return result.trim();
}

/** Remove any JSON from text so it never shows in chat */
export function stripJsonFromText(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?"tracks"[\s\S]*\}/g, '')
    .replace(/\{[\s\S]*?"title"[\s\S]*?"bpm"[\s\S]*\}/g, '')
    .replace(/\{[\s\S]*?"instrument"[\s\S]*\}/g, '')
    .trim();
}

/** Close unmatched brackets/braces in truncated JSON */
export function repairTruncatedJson(json: string): string | null {
  try { JSON.parse(json); return json; } catch { /* needs repair */ }

  let repaired = json.trim();
  // Remove trailing incomplete string (unclosed quote)
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // Odd number of quotes — truncated inside a string value; remove from last quote
    const lastQuote = repaired.lastIndexOf('"');
    repaired = repaired.slice(0, lastQuote) + '"';
  }
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '');

  let braces = 0, brackets = 0, inString = false, escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  while (brackets > 0) { repaired += ']'; brackets--; }
  while (braces > 0) { repaired += '}'; braces--; }

  try { JSON.parse(repaired); return repaired; } catch { return null; }
}

/** Full parse: extract composition + text message from AI response */
export function parseResponse(content: string): { composition: Composition | null; textMessage: string } {
  // Strategy 1: fenced JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const c = JSON.parse(jsonMatch[1].trim()) as Composition;
      const text = content.replace(/```json\s*[\s\S]*?```/, '').trim();
      const v = validateComposition(c);
      if (v) return { composition: v, textMessage: text || "Here's your composition!" };
    } catch { /* fall through */ }
  }

  // Strategy 2: raw JSON with "tracks"
  const rawMatch = content.match(/\{[\s\S]*"tracks"[\s\S]*\}/);
  if (rawMatch) {
    try {
      const c = JSON.parse(rawMatch[0]) as Composition;
      const text = content.replace(rawMatch[0], '').trim();
      const v = validateComposition(c);
      if (v) return { composition: v, textMessage: text || "Here's your composition!" };
    } catch {
      const repaired = repairTruncatedJson(rawMatch[0]);
      if (repaired) {
        try {
          const c = JSON.parse(repaired) as Composition;
          const text = content.replace(rawMatch[0], '').trim();
          const v = validateComposition(c);
          if (v) return { composition: v, textMessage: text || "Here's your composition!" };
        } catch { /* fall through */ }
      }
    }
  }

  // Strategy 3: loose match
  const looseMatch = content.match(/\{[^{}]*"title"[^{}]*"bpm"[\s\S]*/);
  if (looseMatch) {
    const repaired = repairTruncatedJson(looseMatch[0]);
    if (repaired) {
      try {
        const c = JSON.parse(repaired) as Composition;
        const text = content.replace(looseMatch[0], '').trim();
        const v = validateComposition(c);
        if (v) return { composition: v, textMessage: text || "Here's your composition!" };
      } catch { /* fall through */ }
    }
  }

  return { composition: null, textMessage: content };
}

/** Drum-like instrument names that should be merged into a single "drums" track */
const DRUM_NAMES = /^(kick|snare|hihat|hi_hat|tom|cymbal|crash|ride|clap|rim|shaker|tambourine|cowbell|kick_drum|snare_drum|bass_drum|hi_hat_closed|hi_hat_open|floor_tom|rack_tom)$/i;

/** Merge separate drum-instrument tracks (kick_drum, hihat, etc.) into one "drums" track */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDrumTracks(tracks: any[]): any[] {
  const drumTracks: any[] = [];
  const otherTracks: any[] = [];

  for (const t of tracks) {
    if (t.instrument === 'drums') {
      drumTracks.push(t);
    } else if (DRUM_NAMES.test(t.instrument) && t.pattern && t.pattern.length > 0) {
      drumTracks.push(t);
    } else {
      otherTracks.push(t);
    }
  }

  if (drumTracks.length === 0) return tracks;

  // Merge all drum patterns into one "drums" track
  const mergedPattern: any[] = [];
  let volume = 0.7;
  let effects = { reverb: 0, delay: 0 };

  for (const dt of drumTracks) {
    if (dt.pattern) {
      for (const p of dt.pattern) {
        // If the pattern came from a named drum track (e.g. "kick_drum"), ensure the drum field is set
        if (!p.drum && dt.instrument !== 'drums') {
          p.drum = dt.instrument.replace(/_drum$/, '').replace(/^bass_drum$/, 'kick');
        }
        mergedPattern.push(p);
      }
    }
    volume = Math.max(volume, dt.volume ?? 0.7);
    if (dt.effects) {
      effects.reverb = Math.max(effects.reverb, dt.effects.reverb ?? 0);
      effects.delay = Math.max(effects.delay, dt.effects.delay ?? 0);
    }
  }

  const mergedDrums = {
    instrument: 'drums',
    volume,
    muted: false,
    solo: false,
    effects,
    pattern: mergedPattern,
    notes: [],
  };

  return [mergedDrums, ...otherTracks];
}

/** Find the highest measure actually used by any note/pattern across all tracks */
function findActualMeasureCount(tracks: Composition['tracks']): number {
  let maxMeasure = 0;
  for (const track of tracks) {
    const items = track.instrument === 'drums' ? (track.pattern || []) : (track.notes || []);
    for (const item of items) {
      if (!item.time) continue;
      const parts = item.time.split(':').map(Number);
      const measure = (parts[0] || 0) + 1; // measure index is 0-based, count is 1-based
      if (measure > maxMeasure) maxMeasure = measure;
    }
  }
  return maxMeasure;
}

/** Validate and normalize a complete composition */
export function validateComposition(c: Composition): Composition | null {
  if (!c.tracks || !Array.isArray(c.tracks) || c.tracks.length === 0) return null;

  c.title = c.title || 'Untitled Beat';
  c.bpm = Math.max(40, Math.min(200, c.bpm || 90));
  c.measures = Math.max(1, Math.min(128, c.measures || 4));
  c.swing = Math.max(0, Math.min(1, c.swing || 0));
  c.key = c.key || 'C';
  c.timeSignature = c.timeSignature || '4/4';

  // Merge separate drum tracks into one "drums" track
  c.tracks = normalizeDrumTracks(c.tracks);

  c.tracks = c.tracks
    .map((track) => ({
      ...track,
      volume: Math.max(0, Math.min(1, track.volume ?? 0.7)),
      muted: track.muted ?? false,
      solo: track.solo ?? false,
      effects: {
        reverb: Math.max(0, Math.min(1, track.effects?.reverb ?? 0)),
        delay: Math.max(0, Math.min(1, track.effects?.delay ?? 0)),
      },
    }))
    // Strip empty tracks — no notes AND no pattern means the AI forgot to fill them
    .filter((track) => {
      const hasNotes = track.notes && track.notes.length > 0;
      const hasPattern = track.pattern && track.pattern.length > 0;
      return hasNotes || hasPattern;
    });

  if (c.tracks.length === 0) return null;

  // Shrink measures to match actual content if LLM left the back half empty.
  // This prevents silent gaps in the loop.
  const actualMeasures = findActualMeasureCount(c.tracks);
  if (actualMeasures > 0 && actualMeasures < c.measures) {
    // Only shrink if less than 75% filled — avoids shrinking when just the last beat is missing
    if (actualMeasures / c.measures < 0.75) {
      c.measures = actualMeasures;
    }
  }

  return c;
}

// ═══════════════════════════════════════════════════════════════
//  BRACE-COUNTING STREAMING PARSER
//  Extracts individual complete note objects from partial JSON
//  without needing the entire document to be valid.
// ═══════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function extractStringVal(text: string, key: string): string | null {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`));
  return m ? m[1] : null;
}

function extractNumVal(text: string, key: string): number | null {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*([\\d.]+)`));
  return m ? parseFloat(m[1]) : null;
}

function extractBoolVal(text: string, key: string): boolean | null {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`));
  return m ? m[1] === 'true' : null;
}

/** Extract complete {...} objects from a named JSON array within a text section */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCompleteObjects(section: string, arrayKey: string): any[] {
  const arrayMatch = section.match(new RegExp(`"${arrayKey}"\\s*:\\s*\\[`));
  if (!arrayMatch || arrayMatch.index === undefined) return [];

  const startIdx = arrayMatch.index + arrayMatch[0].length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objects: any[] = [];

  let i = startIdx;
  while (i < section.length) {
    // Skip whitespace and commas
    while (i < section.length && /[\s,]/.test(section[i])) i++;
    if (i >= section.length || section[i] === ']') break;
    if (section[i] !== '{') break;

    // Found '{' — count braces to find matching '}'
    let depth = 0;
    const objStart = i;
    let inStr = false;
    let esc = false;

    for (; i < section.length; i++) {
      const ch = section[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }

    if (depth === 0) {
      try {
        objects.push(JSON.parse(section.slice(objStart, i)));
      } catch { /* malformed object — skip */ }
    } else {
      break; // unclosed brace — still streaming this object
    }
  }

  return objects;
}

/** Extract a composition from partial/streaming JSON using brace-counting.
 *  Does NOT require the entire JSON to be valid — extracts metadata with regex
 *  and finds complete note objects within arrays using depth tracking. */
export function extractStreamingComposition(text: string): Composition | null {
  const stripped = stripThinkingTags(text);

  // Find all instrument declarations — each marks a track
  const instrumentMatches: { name: string; index: number }[] = [];
  const instrRe = /"instrument"\s*:\s*"([^"]+)"/g;
  let instrMatch;
  while ((instrMatch = instrRe.exec(stripped)) !== null) {
    instrumentMatches.push({ name: instrMatch[1], index: instrMatch.index });
  }
  if (instrumentMatches.length === 0) return null;

  // Extract top-level metadata from text BEFORE the first track
  const metaSection = stripped.slice(0, instrumentMatches[0].index);
  const title = extractStringVal(metaSection, 'title') || 'Untitled Beat';
  const bpm = clamp(extractNumVal(metaSection, 'bpm') || 90, 40, 200);
  const measures = clamp(extractNumVal(metaSection, 'measures') || 4, 1, 128);
  const swing = clamp(extractNumVal(metaSection, 'swing') || 0, 0, 1);
  const key = extractStringVal(metaSection, 'key') || 'C';
  const timeSignature = extractStringVal(metaSection, 'timeSignature') || '4/4';

  const tracks: Composition['tracks'] = [];

  for (let ti = 0; ti < instrumentMatches.length; ti++) {
    const im = instrumentMatches[ti];
    const instrument = im.name;
    const trackStart = im.index;
    const trackEnd = ti + 1 < instrumentMatches.length
      ? instrumentMatches[ti + 1].index
      : stripped.length;
    const section = stripped.slice(trackStart, trackEnd);

    // Extract track-level properties via regex within this track section
    const volume = clamp(extractNumVal(section, 'volume') ?? 0.7, 0, 1);
    const muted = extractBoolVal(section, 'muted') ?? false;
    const solo = extractBoolVal(section, 'solo') ?? false;
    const reverb = clamp(extractNumVal(section, 'reverb') ?? 0, 0, 1);
    const delay = clamp(extractNumVal(section, 'delay') ?? 0, 0, 1);

    // Extract complete note objects from "notes":[...] array
    const notes = extractCompleteObjects(section, 'notes')
        .filter((n: { note?: string; time?: string }) => n && n.note && n.time);

    // Extract complete pattern objects from "pattern":[...] array
    const pattern = extractCompleteObjects(section, 'pattern')
        .filter((p: { drum?: string; time?: string }) => p && p.drum && p.time);

    tracks.push({
      instrument,
      volume,
      muted,
      solo,
      effects: { reverb, delay },
      notes,
      pattern,
    });
  }

  if (tracks.length === 0) return null;

  // Merge separate drum tracks into one "drums" track
  const normalizedTracks = normalizeDrumTracks(tracks);

  return { title, bpm, measures, swing, key, timeSignature, tracks: normalizedTracks };
}
