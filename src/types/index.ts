export interface Baby {
  id: string;
  owner_id?: string | null;
  name: string;
  created_at: string;
}

export interface TummySession {
  id: string;
  owner_id?: string | null;
  baby_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailyGoal {
  id: string;
  owner_id?: string | null;
  baby_id: string;
  target_minutes: number;
  created_at: string;
}

export interface DailyStat {
  date: string;
  total_seconds: number;
  session_count: number;
}

export type AuthMode = 'authed' | 'anon';

export interface Store {
  mode: AuthMode;
  listBabies(): Promise<Baby[]>;
  createBaby(name: string): Promise<Baby>;
  updateBaby(id: string, name: string): Promise<Baby>;
  deleteBaby(id: string): Promise<void>;
  listSessions(babyId: string, limit?: number): Promise<TummySession[]>;
  getActiveSession(babyId: string): Promise<TummySession | null>;
  startSession(babyId: string): Promise<TummySession>;
  endSession(id: string, endedAt: string, durationSeconds: number): Promise<void>;
  updateSession(id: string, patch: Partial<Pick<TummySession, 'started_at' | 'ended_at' | 'duration_seconds' | 'notes'>>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getGoal(babyId: string): Promise<DailyGoal | null>;
  setGoal(babyId: string, minutes: number): Promise<DailyGoal>;
  subscribe(babyId: string, onChange: () => void): () => void;
}
