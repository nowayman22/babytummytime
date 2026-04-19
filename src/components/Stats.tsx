import { useEffect, useState } from 'react';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { TummySession, DailyStat } from '../types';

const BAR_WIDTH = 20;

function asciiBar(val: number, max: number, goal: number) {
  const filled = max > 0 ? Math.round((val / max) * BAR_WIDTH) : 0;
  const goalPos = max > 0 ? Math.round((goal / max) * BAR_WIDTH) : BAR_WIDTH;
  let bar = '';
  for (let i = 0; i < BAR_WIDTH; i++) {
    if (i < filled) bar += '█';
    else if (i === goalPos && val < goal) bar += '|';
    else bar += '░';
  }
  return bar;
}

function streak(stats: DailyStat[], goalSecs: number) {
  let count = 0;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const d = parseISO(s.date);
    const expected = subDays(new Date(), i);
    if (format(d, 'yyyy-MM-dd') !== format(expected, 'yyyy-MM-dd')) break;
    if (s.total_seconds >= goalSecs) count++;
    else break;
  }
  return count;
}

interface Props {
  babyId: string | null;
  goalMinutes: number;
  refreshKey: number;
}

export default function Stats({ babyId, goalMinutes, refreshKey }: Props) {
  const [stats, setStats]   = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);

  const goalSecs = goalMinutes * 60;

  useEffect(() => {
    if (!babyId) return;
    setLoading(true);
    const since = subDays(new Date(), 6);
    supabase
      .from('tummy_sessions')
      .select('started_at, duration_seconds')
      .eq('baby_id', babyId)
      .not('ended_at', 'is', null)
      .gte('started_at', startOfDay(since).toISOString())
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        const raw = data as Pick<TummySession, 'started_at' | 'duration_seconds'>[] ?? [];
        // Aggregate by day
        const map: Record<string, DailyStat> = {};
        for (let i = 6; i >= 0; i--) {
          const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
          map[d] = { date: d, total_seconds: 0, session_count: 0 };
        }
        for (const row of raw) {
          const d = row.started_at.slice(0, 10);
          if (map[d]) {
            map[d].total_seconds += row.duration_seconds ?? 0;
            map[d].session_count += 1;
          }
        }
        const ordered = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
        setStats(ordered);
        setLoading(false);
      });
  }, [babyId, refreshKey]);

  if (!babyId) return (
    <div className="text-t-muted text-center py-12 text-sm font-mono">
      configure baby name in settings
    </div>
  );
  if (loading) return (
    <div className="text-t-muted text-center py-12 text-sm font-mono animate-pulse">
      loading stats...
    </div>
  );

  const todayStat  = stats[0];
  const maxSecs    = Math.max(...stats.map(s => s.total_seconds), goalSecs);
  const streakCount = streak([...stats].reverse(), goalSecs);
  const totalWeek  = stats.reduce((a, s) => a + s.total_seconds, 0);

  return (
    <div className="py-4 px-2 font-mono text-sm space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TODAY",   val: todayStat ? `${Math.floor(todayStat.total_seconds/60)}m` : '0m',
            sub: todayStat?.total_seconds >= goalSecs ? '✓ goal met' : `goal: ${goalMinutes}m`,
            color: (todayStat?.total_seconds ?? 0) >= goalSecs ? '#00ff88' : '#ffaa00' },
          { label: "STREAK",  val: `${streakCount}d`, sub: 'days in a row', color: streakCount > 0 ? '#00ff88' : '#556655' },
          { label: "WEEK",    val: `${Math.floor(totalWeek/60)}m`, sub: '7-day total', color: '#44aaff' },
        ].map(card => (
          <div key={card.label} className="border border-t-border rounded bg-t-card p-3 text-center">
            <div className="text-t-muted text-xs tracking-widest">{card.label}</div>
            <div className="text-2xl mt-1" style={{ color: card.color }}>{card.val}</div>
            <div className="text-t-muted text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="border border-t-border rounded bg-t-card p-4">
        <div className="text-t-muted text-xs tracking-widest mb-4">── LAST 7 DAYS ──</div>
        <div className="space-y-2">
          {stats.map(s => {
            const isT    = s.date === format(new Date(), 'yyyy-MM-dd');
            const mins   = Math.floor(s.total_seconds / 60);
            const met    = s.total_seconds >= goalSecs;
            const bar    = asciiBar(s.total_seconds, maxSecs, goalSecs);
            const day    = format(parseISO(s.date), 'EEE').toUpperCase();
            return (
              <div key={s.date} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-t-muted" style={{ color: isT ? '#00ff88' : undefined }}>
                  {day}
                </span>
                <span
                  className="flex-1 tracking-tighter"
                  style={{ color: met ? '#00ff88' : s.total_seconds > 0 ? '#ffaa00' : '#1a2e20' }}
                >
                  {bar}
                </span>
                <span className="w-16 text-right" style={{ color: met ? '#00ff88' : '#556655' }}>
                  {mins}m {met ? '✓' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-t-muted text-xs mt-3 border-t border-t-border pt-2">
          | = {goalMinutes}m goal mark
        </div>
      </div>

      {/* Personal bests */}
      <div className="border border-t-border rounded bg-t-card p-4">
        <div className="text-t-muted text-xs tracking-widest mb-3">── THIS WEEK ──</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-t-muted">best day</span>
            <span className="text-t-gdim">
              {stats.length > 0
                ? `${Math.floor(Math.max(...stats.map(s => s.total_seconds)) / 60)}m`
                : '0m'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-t-muted">days met goal</span>
            <span className="text-t-gdim">
              {stats.filter(s => s.total_seconds >= goalSecs).length} / 7
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-t-muted">total sessions</span>
            <span className="text-t-gdim">
              {stats.reduce((a, s) => a + s.session_count, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-t-muted">avg per day</span>
            <span className="text-t-gdim">
              {Math.floor(totalWeek / 7 / 60)}m {Math.floor((totalWeek / 7) % 60)}s
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
