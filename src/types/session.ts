import { Composition } from './composition';
import { ChatMessage } from './chat';

export interface Session {
  id: string;
  name: string;
  composition: Composition | null;
  messages: ChatMessage[];
  undoStack: Composition[];
  redoStack: Composition[];
  trackVolumes: Record<string, number>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;
  bpm: number;
  swing: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
