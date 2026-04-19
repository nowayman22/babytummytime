import type { Baby, DailyGoal, Store, TummySession } from '../types';

const K_BABIES   = 'btt.local.babies';
const K_SESSIONS = 'btt.local.sessions';
const K_GOALS    = 'btt.local.goals';

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); }
  catch { return []; }
}
function save<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('btt-local-change'));
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createLocalStore(): Store {
  return {
    mode: 'anon',

    async listBabies() {
      return load<Baby>(K_BABIES).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },

    async createBaby(name) {
      const babies = load<Baby>(K_BABIES);
      const b: Baby = { id: uuid(), name, created_at: new Date().toISOString(), owner_id: null };
      babies.push(b);
      save(K_BABIES, babies);
      return b;
    },

    async updateBaby(id, name) {
      const babies = load<Baby>(K_BABIES);
      const i = babies.findIndex(b => b.id === id);
      if (i < 0) throw new Error('Baby not found');
      babies[i] = { ...babies[i], name };
      save(K_BABIES, babies);
      return babies[i];
    },

    async deleteBaby(id) {
      save(K_BABIES,   load<Baby>(K_BABIES).filter(b => b.id !== id));
      save(K_SESSIONS, load<TummySession>(K_SESSIONS).filter(s => s.baby_id !== id));
      save(K_GOALS,    load<DailyGoal>(K_GOALS).filter(g => g.baby_id !== id));
    },

    async listSessions(babyId, limit = 200) {
      return load<TummySession>(K_SESSIONS)
        .filter(s => s.baby_id === babyId && s.ended_at)
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .slice(0, limit);
    },

    async startSession(babyId) {
      const sessions = load<TummySession>(K_SESSIONS);
      const s: TummySession = {
        id: uuid(), baby_id: babyId, owner_id: null,
        started_at: new Date().toISOString(),
        ended_at: null, duration_seconds: null, notes: null,
        created_at: new Date().toISOString(),
      };
      sessions.push(s);
      save(K_SESSIONS, sessions);
      return s;
    },

    async endSession(id, endedAt, durationSeconds) {
      const sessions = load<TummySession>(K_SESSIONS);
      const i = sessions.findIndex(s => s.id === id);
      if (i < 0) return;
      sessions[i] = { ...sessions[i], ended_at: endedAt, duration_seconds: durationSeconds };
      save(K_SESSIONS, sessions);
    },

    async updateSession(id, patch) {
      const sessions = load<TummySession>(K_SESSIONS);
      const i = sessions.findIndex(s => s.id === id);
      if (i < 0) return;
      sessions[i] = { ...sessions[i], ...patch };
      save(K_SESSIONS, sessions);
    },

    async deleteSession(id) {
      save(K_SESSIONS, load<TummySession>(K_SESSIONS).filter(s => s.id !== id));
    },

    async getGoal(babyId) {
      const goals = load<DailyGoal>(K_GOALS).filter(g => g.baby_id === babyId);
      goals.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return goals[0] ?? null;
    },

    async setGoal(babyId, minutes) {
      const goals = load<DailyGoal>(K_GOALS);
      const existing = goals.find(g => g.baby_id === babyId);
      if (existing) {
        existing.target_minutes = minutes;
        save(K_GOALS, goals);
        return existing;
      }
      const g: DailyGoal = {
        id: uuid(), baby_id: babyId, owner_id: null,
        target_minutes: minutes,
        created_at: new Date().toISOString(),
      };
      goals.push(g);
      save(K_GOALS, goals);
      return g;
    },

    subscribe(_babyId, onChange) {
      window.addEventListener('btt-local-change', onChange);
      return () => window.removeEventListener('btt-local-change', onChange);
    },
  };
}

export function hasLocalData(): boolean {
  return load<TummySession>(K_SESSIONS).length > 0 || load<Baby>(K_BABIES).length > 0;
}

export function exportLocal() {
  return {
    babies:   load<Baby>(K_BABIES),
    sessions: load<TummySession>(K_SESSIONS),
    goals:    load<DailyGoal>(K_GOALS),
  };
}

export function clearLocal() {
  localStorage.removeItem(K_BABIES);
  localStorage.removeItem(K_SESSIONS);
  localStorage.removeItem(K_GOALS);
}
