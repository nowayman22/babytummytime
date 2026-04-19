export interface Baby {
  id: string;
  name: string;
  created_at: string;
}

export interface TummySession {
  id: string;
  baby_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailyGoal {
  id: string;
  baby_id: string;
  target_minutes: number;
  created_at: string;
}

export interface DailyStat {
  date: string;            // YYYY-MM-DD
  total_seconds: number;
  session_count: number;
}
