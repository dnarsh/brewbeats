export interface GhostNote {
  id: string;
  trackIndex: number;
  note: string;
  duration: string;
  time: string;
  velocity: number;
  groupId: string;
  status: 'pending' | 'accepted' | 'rejected';
  action: 'add' | 'delete' | 'modify'; // what kind of change this ghost represents
  replacesNote?: { trackIndex: number; time: string; note: string };
  locked?: boolean; // if true, AI won't re-suggest this change (user permanently rejected it)
}

export interface GhostInstrument {
  id: string;
  instrument: string;
  groupId: string;
  action: 'add' | 'delete'; // add new instrument or delete existing
  existingTrackIndex?: number; // for delete: which track to remove
  status: 'pending' | 'accepted' | 'rejected';
}

export interface NoteHighlight {
  trackIndex: number;
  time: string;
  note?: string;
  drum?: string;
  color: 'yellow' | 'red' | 'green';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'add' | 'remove' | 'modify' | 'highlight';
  ghostNotes?: GhostNote[];
  ghostInstruments?: GhostInstrument[];
  highlights?: NoteHighlight[];
  status: 'pending' | 'applied' | 'dismissed';
  newInstrument?: string;
  removeTrack?: number;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Suggestion[];
  timestamp: number;
}

// Tracks what the user has permanently rejected — AI won't re-suggest these
export interface LockedRejection {
  type: 'note' | 'instrument';
  trackIndex: number;
  note?: string;
  time?: string;
  instrument?: string;
}
