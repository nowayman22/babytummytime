import { useEffect, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { TummySession } from '../types';

function fmtDuration(s: number | null) {
  if (!s) return '--:--';
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}m ${sec}s`;
}

function groupByDate(sessions: TummySession[]) {
  const groups: Record<string, TummySession[]> = {};
  for (const s of sessions) {
    const d = s.started_at.slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(s);
  }
  return groups;
}

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d))     return 'TODAY';
  if (isYesterday(d)) return 'YESTERDAY';
  return format(d, 'EEE, MMM d').toUpperCase();
}

function totalForGroup(sessions: TummySession[]) {
  const t = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  return `${Math.floor(t / 60)}m ${t % 60}s`;
}

interface Props {
  babyId: string | null;
  refreshKey: number;
}

export default function SessionList({ babyId, refreshKey }: Props) {
  const [sessions, setSessions] = useState<TummySession[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!babyId) return;
    setLoading(true);
    supabase
      .from('tummy_sessions')
      .select('*')
      .eq('baby_id', babyId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setSessions(data ?? []);
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
      loading sessions...
    </div>
  );

  if (sessions.length === 0) return (
    <div className="text-t-muted text-center py-12 text-sm font-mono">
      no sessions yet — start your first tummy time!
    </div>
  );

  const groups = groupByDate(sessions);

  return (
    <div className="flex flex-col gap-4 py-4 px-2">
      {Object.entries(groups).map(([date, group]) => (
        <div key={date} className="border border-t-border rounded bg-t-card overflow-hidden">
          {/* Date header */}
          <div className="flex justify-between items-center px-4 py-2 bg-t-gdark">
            <span className="text-t-green text-xs font-mono tracking-widest">{dateLabel(date)}</span>
            <span className="text-t-muted text-xs font-mono">
              {group.length} session{group.length !== 1 ? 's' : ''} · {totalForGroup(group)}
            </span>
          </div>

          {/* Sessions */}
          {group.map((s) => (
            <div key={s.id}>
              <button
                className="w-full text-left px-4 py-3 hover:bg-t-gdark transition-colors border-t border-t-border first:border-t-0"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex justify-between items-center font-mono text-sm">
                  <span className="text-t-text">
                    {format(parseISO(s.started_at), 'HH:mm')}
                    <span className="text-t-muted mx-2">→</span>
                    {s.ended_at ? format(parseISO(s.ended_at), 'HH:mm') : '...'}
                  </span>
                  <span className="text-t-gdim">{fmtDuration(s.duration_seconds)}</span>
                </div>
                {s.notes && (
                  <div className="text-t-muted text-xs mt-1 truncate">
                    ✎ {s.notes}
                  </div>
                )}
              </button>

              {expanded === s.id && (
                <div className="px-4 pb-3 text-xs font-mono text-t-muted border-t border-t-border bg-t-bg">
                  <div className="mt-2 space-y-1">
                    <div>started:  <span className="text-t-text">{format(parseISO(s.started_at), 'HH:mm:ss')}</span></div>
                    {s.ended_at && <div>ended:    <span className="text-t-text">{format(parseISO(s.ended_at), 'HH:mm:ss')}</span></div>}
                    <div>duration: <span className="text-t-gdim">{fmtDuration(s.duration_seconds)}</span></div>
                    {s.notes && <div className="mt-2 pt-2 border-t border-t-border">note: <span className="text-t-text">{s.notes}</span></div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
