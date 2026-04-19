import { useEffect, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from './lib/supabase';
import type { Baby, DailyGoal, TummySession } from './types';
import Timer from './components/Timer';
import SessionList from './components/SessionList';
import Stats from './components/Stats';
import Settings from './components/Settings';

type Tab = 'timer' | 'history' | 'stats' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'timer',    label: '[ TIMER ]'   },
  { id: 'history',  label: '[ HISTORY ]' },
  { id: 'stats',    label: '[ STATS ]'   },
  { id: 'settings', label: '[ CONFIG ]'  },
];

export default function App() {
  const [tab, setTab]                     = useState<Tab>('timer');
  const [baby, setBaby]                   = useState<Baby | null>(null);
  const [goal, setGoal]                   = useState<DailyGoal | null>(null);
  const [todaySeconds, setTodaySeconds]   = useState(0);
  const [refreshKey, setRefreshKey]       = useState(0);
  const [loading, setLoading]             = useState(true);

  // Auto-discover baby from Supabase (works across all devices)
  useEffect(() => {
    (async () => {
      const { data: babies } = await supabase
        .from('babies')
        .select('*')
        .order('created_at', { ascending: true });

      if (!babies || babies.length === 0) {
        setLoading(false);
        setTab('settings');
        return;
      }

      // ALWAYS use the oldest baby — the canonical record shared by all devices.
      const selected = babies[0];
      localStorage.setItem('baby_id', selected.id);
      setBaby(selected);

      const { data: goalRow } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('baby_id', selected.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalRow) setGoal(goalRow);
      setLoading(false);
    })();
  }, []);

  // Refresh data on window focus (so each device sees the other's progress)
  useEffect(() => {
    const onFocus = () => setRefreshKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Realtime subscription — instant updates when the other device adds a session
  useEffect(() => {
    if (!baby) return;
    const channel = supabase
      .channel(`sessions:${baby.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tummy_sessions', filter: `baby_id=eq.${baby.id}` },
        () => setRefreshKey(k => k + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_goals', filter: `baby_id=eq.${baby.id}` },
        async () => {
          const { data } = await supabase
            .from('daily_goals')
            .select('*')
            .eq('baby_id', baby.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) setGoal(data);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [baby]);

  const loadTodaySeconds = async (babyId: string) => {
    const today = new Date();
    const { data } = await supabase
      .from('tummy_sessions')
      .select('duration_seconds')
      .eq('baby_id', babyId)
      .not('ended_at', 'is', null)
      .gte('started_at', startOfDay(today).toISOString())
      .lte('started_at', endOfDay(today).toISOString());

    const total = (data ?? []).reduce(
      (a: number, s: Pick<TummySession, 'duration_seconds'>) => a + (s.duration_seconds ?? 0),
      0
    );
    setTodaySeconds(total);
  };

  useEffect(() => {
    if (baby) loadTodaySeconds(baby.id);
  }, [baby, refreshKey]);

  const handleSessionSaved = () => setRefreshKey(k => k + 1);

  const handleSettingsSaved = (b: Baby, g: DailyGoal) => {
    setBaby(b);
    setGoal(g);
    setTab('timer');
  };

  if (loading) return (
    <div className="min-h-screen bg-t-bg flex items-center justify-center font-mono text-t-muted">
      <div className="animate-pulse">loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-t-bg text-t-text font-mono flex flex-col select-none">
      {/* Header */}
      <header className="border-b border-t-border px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-t-green text-lg" style={{ textShadow: '0 0 10px #00ff8844' }}>
          ♡ Baby Tummy Time
        </span>
        <div className="text-xs flex items-center gap-3">
          {baby
            ? <span className="text-t-gdim">[ {baby.name} ]</span>
            : <span className="text-t-red">[ setup required ]</span>
          }
          <span className="text-t-muted">{format(new Date(), 'EEE, MMM d')}</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-t-border flex shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-xs tracking-widest transition-all duration-150"
            style={{
              color:        tab === t.id ? '#00ff88' : '#556655',
              background:   tab === t.id ? '#0a1a10' : 'transparent',
              borderBottom: tab === t.id ? '2px solid #00ff88' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full">
        {tab === 'timer' && (
          <Timer
            babyId={baby?.id ?? null}
            babyName={baby?.name ?? ''}
            goalMinutes={goal?.target_minutes ?? 30}
            todaySeconds={todaySeconds}
            onSessionSaved={handleSessionSaved}
          />
        )}
        {tab === 'history' && (
          <SessionList babyId={baby?.id ?? null} refreshKey={refreshKey} />
        )}
        {tab === 'stats' && (
          <Stats
            babyId={baby?.id ?? null}
            goalMinutes={goal?.target_minutes ?? 30}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'settings' && (
          <Settings baby={baby} goal={goal} onSaved={handleSettingsSaved} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-t-border px-4 py-2 flex justify-between text-xs text-t-muted shrink-0">
        <span className="hidden sm:inline">SPACE to start / stop</span>
        <span className="sm:hidden">tap to track</span>
        <span style={{ color: '#1a3a22' }}>v0.3.0</span>
      </footer>
    </div>
  );
}
