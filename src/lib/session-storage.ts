import { Session, SessionMeta } from '@/types/session';

const LIST_KEY = 'brewbeats-sessions';
const SESSION_KEY_PREFIX = 'brewbeats-session-';
const ACTIVE_KEY = 'brewbeats-active-session';

function safe<T>(fn: () => T, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return fn(); } catch { return fallback; }
}

/** Get list of session metadata (lightweight) */
export function getSessionList(): SessionMeta[] {
  return safe(() => {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  }, []);
}

/** Save session list metadata */
function saveSessionList(list: SessionMeta[]) {
  safe(() => localStorage.setItem(LIST_KEY, JSON.stringify(list)), undefined);
}

/** Get full session data by ID */
export function loadSession(id: string): Session | null {
  return safe(() => {
    const raw = localStorage.getItem(SESSION_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  }, null);
}

/** Save full session data */
export function saveSession(session: Session) {
  safe(() => {
    localStorage.setItem(SESSION_KEY_PREFIX + session.id, JSON.stringify(session));
    // Update list metadata
    const list = getSessionList();
    const idx = list.findIndex((s) => s.id === session.id);
    const meta: SessionMeta = {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
    if (idx >= 0) list[idx] = meta;
    else list.unshift(meta);
    saveSessionList(list);
  }, undefined);
}

/** Delete a session */
export function deleteSession(id: string) {
  safe(() => {
    localStorage.removeItem(SESSION_KEY_PREFIX + id);
    const list = getSessionList().filter((s) => s.id !== id);
    saveSessionList(list);
  }, undefined);
}

/** Rename a session in the list */
export function renameSession(id: string, newName: string) {
  safe(() => {
    // Update metadata list
    const list = getSessionList();
    const meta = list.find((s) => s.id === id);
    if (meta) {
      meta.name = newName;
      meta.updatedAt = Date.now();
      saveSessionList(list);
    }
    // Update full session data
    const session = loadSession(id);
    if (session) {
      session.name = newName;
      session.updatedAt = Date.now();
      localStorage.setItem(SESSION_KEY_PREFIX + id, JSON.stringify(session));
    }
  }, undefined);
}

export function getActiveSessionId(): string | null {
  return safe(() => localStorage.getItem(ACTIVE_KEY), null);
}

export function setActiveSessionId(id: string | null) {
  safe(() => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  }, undefined);
}
