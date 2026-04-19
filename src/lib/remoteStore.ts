import type { Baby, DailyGoal, Store, TummySession } from '../types';
import { supabase } from './supabase';

export function createRemoteStore(ownerId: string): Store {
  return {
    mode: 'authed',

    async listBabies() {
      const { data, error } = await supabase
        .from('babies').select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Baby[];
    },

    async createBaby(name) {
      const { data, error } = await supabase
        .from('babies').insert({ name, owner_id: ownerId }).select().single();
      if (error) throw error;
      return data as Baby;
    },

    async updateBaby(id, name) {
      const { data, error } = await supabase
        .from('babies').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data as Baby;
    },

    async deleteBaby(id) {
      const { error } = await supabase.from('babies').delete().eq('id', id);
      if (error) throw error;
    },

    async listSessions(babyId, limit = 200) {
      const { data, error } = await supabase
        .from('tummy_sessions').select('*')
        .eq('baby_id', babyId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TummySession[];
    },

    async startSession(babyId) {
      const { data, error } = await supabase
        .from('tummy_sessions')
        .insert({ baby_id: babyId, owner_id: ownerId, started_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      return data as TummySession;
    },

    async endSession(id, endedAt, durationSeconds) {
      const { error } = await supabase
        .from('tummy_sessions')
        .update({ ended_at: endedAt, duration_seconds: durationSeconds })
        .eq('id', id);
      if (error) throw error;
    },

    async updateSession(id, patch) {
      const { error } = await supabase.from('tummy_sessions').update(patch).eq('id', id);
      if (error) throw error;
    },

    async deleteSession(id) {
      const { error } = await supabase.from('tummy_sessions').delete().eq('id', id);
      if (error) throw error;
    },

    async getGoal(babyId) {
      const { data } = await supabase
        .from('daily_goals').select('*')
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      return (data ?? null) as DailyGoal | null;
    },

    async setGoal(babyId, minutes) {
      const existing = await this.getGoal(babyId);
      if (existing) {
        const { data, error } = await supabase
          .from('daily_goals').update({ target_minutes: minutes })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        return data as DailyGoal;
      }
      const { data, error } = await supabase
        .from('daily_goals')
        .insert({ baby_id: babyId, owner_id: ownerId, target_minutes: minutes })
        .select().single();
      if (error) throw error;
      return data as DailyGoal;
    },

    subscribe(babyId, onChange) {
      const ch = supabase
        .channel(`sessions:${babyId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tummy_sessions', filter: `baby_id=eq.${babyId}` },
          onChange)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'daily_goals', filter: `baby_id=eq.${babyId}` },
          onChange)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'babies', filter: `owner_id=eq.${ownerId}` },
          onChange)
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    },
  };
}

export async function uploadLocalData(
  ownerId: string,
  data: { babies: Baby[]; sessions: TummySession[]; goals: DailyGoal[] }
) {
  const idMap = new Map<string, string>();

  for (const b of data.babies) {
    const { data: inserted, error } = await supabase
      .from('babies')
      .insert({ name: b.name, owner_id: ownerId, created_at: b.created_at })
      .select().single();
    if (error) throw error;
    idMap.set(b.id, (inserted as Baby).id);
  }

  if (data.sessions.length > 0) {
    const rows = data.sessions
      .map(s => ({
        baby_id: idMap.get(s.baby_id),
        owner_id: ownerId,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        notes: s.notes,
        created_at: s.created_at,
      }))
      .filter(r => r.baby_id);
    if (rows.length > 0) {
      const { error } = await supabase.from('tummy_sessions').insert(rows);
      if (error) throw error;
    }
  }

  for (const g of data.goals) {
    const newBabyId = idMap.get(g.baby_id);
    if (!newBabyId) continue;
    await supabase.from('daily_goals').insert({
      baby_id: newBabyId,
      owner_id: ownerId,
      target_minutes: g.target_minutes,
      created_at: g.created_at,
    });
  }
}
