import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';
import type { TummySession } from '../types';

interface Props { onBack: () => void; }

function fmtDuration(s: number | null) {
  if (s == null) return '--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, '0')}s`;
}

function toLocalDT(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryEditor({ onBack }: Props) {
  const { activeBaby, store, refresh, refreshKey } = useApp();
  const [sessions, setSessions] = useState<TummySession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<string | null>(null);
  const [err, setErr]           = useState<string | null>(null);

  useEffect(() => {
    if (!activeBaby) return;
    setLoading(true);
    store.listSessions(activeBaby.id, 500)
      .then(data => { setSessions(data); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [activeBaby, store, refreshKey]);

  if (!activeBaby) return (
    <div className="py-6 px-2 font-mono max-w-md mx-auto">
      <div className="text-t-muted text-center">select a baby first</div>
      <button onClick={onBack} className="mt-4 w-full py-2 text-xs border border-t-border rounded text-t-muted">← back</button>
    </div>
  );

  const save = async (s: TummySession, patch: Partial<TummySession>) => {
    try {
      const merged = { ...s, ...patch };
      if (merged.started_at && merged.ended_at) {
        const dur = Math.max(0, Math.floor((new Date(merged.ended_at).getTime() - new Date(merged.started_at).getTime()) / 1000));
        patch.duration_seconds = dur;
      }
      await store.updateSession(s.id, patch);
      setEditing(null);
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    try { await store.deleteSession(id); refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="py-6 px-2 font-mono max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-t-muted text-xs hover:text-t-green">← back</button>
        <div className="text-t-muted text-xs tracking-widest">── EDIT HISTORY ──</div>
        <span />
      </div>

      {err && <div className="text-t-red text-xs border border-t-red rounded px-3 py-2">⚠ {err}</div>}

      {loading && <div className="text-t-muted text-xs text-center py-6 animate-pulse">loading...</div>}

      {!loading && sessions.length === 0 && (
        <div className="text-t-muted text-xs text-center py-6">no sessions yet</div>
      )}

      {sessions.map(s => (
        <div key={s.id} className="border border-t-border rounded bg-t-card p-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-t-text">{format(parseISO(s.started_at), 'MMM d · HH:mm')}</span>
            <span className="text-t-gdim">{fmtDuration(s.duration_seconds)}</span>
          </div>

          {editing === s.id ? (
            <EditForm session={s} onSave={(patch) => save(s, patch)} onCancel={() => setEditing(null)} />
          ) : (
            <>
              {s.notes && <div className="text-t-muted text-xs italic">✎ {s.notes}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(s.id)}
                  className="flex-1 py-1 text-xs rounded border border-t-border text-t-muted hover:border-t-green hover:text-t-green">edit</button>
                <button onClick={() => del(s.id)}
                  className="flex-1 py-1 text-xs rounded border border-t-border text-t-muted hover:border-t-red hover:text-t-red">delete</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function EditForm({
  session, onSave, onCancel,
}: {
  session: TummySession;
  onSave: (patch: Partial<TummySession>) => void;
  onCancel: () => void;
}) {
  const [started, setStarted] = useState(toLocalDT(session.started_at));
  const [ended, setEnded]     = useState(session.ended_at ? toLocalDT(session.ended_at) : '');
  const [notes, setNotes]     = useState(session.notes ?? '');

  return (
    <div className="space-y-2">
      <label className="block text-t-muted text-xs">start</label>
      <input type="datetime-local" value={started} onChange={e => setStarted(e.target.value)}
        className="w-full bg-t-bg border border-t-border text-t-text text-xs rounded px-2 py-1" />
      <label className="block text-t-muted text-xs">end</label>
      <input type="datetime-local" value={ended} onChange={e => setEnded(e.target.value)}
        className="w-full bg-t-bg border border-t-border text-t-text text-xs rounded px-2 py-1" />
      <label className="block text-t-muted text-xs">notes</label>
      <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full bg-t-bg border border-t-border text-t-text text-xs rounded px-2 py-1 resize-none" />
      <div className="flex gap-2">
        <button onClick={() => onSave({
          started_at: new Date(started).toISOString(),
          ended_at: ended ? new Date(ended).toISOString() : null,
          notes: notes.trim() || null,
        })}
          className="flex-1 py-1 text-xs rounded border border-t-green text-t-green hover:bg-t-gdark">save</button>
        <button onClick={onCancel}
          className="flex-1 py-1 text-xs rounded border border-t-border text-t-muted">cancel</button>
      </div>
    </div>
  );
}
