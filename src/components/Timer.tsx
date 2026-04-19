import AsciiAnimation from './AsciiAnimation';
import { useTimer } from '../hooks/useTimer';

function fmt(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

interface Props {
  babyId: string | null;
  babyName: string;
  goalMinutes: number;
  todaySeconds: number;
  onSessionSaved: () => void;
}

export default function Timer({ babyId, babyName, goalMinutes, todaySeconds, onSessionSaved }: Props) {
  const { isRunning, elapsed, showNotes, notes, setNotes, toggle, saveNote, skipNote, error } =
    useTimer(babyId, onSessionSaved);

  const goalSecs   = goalMinutes * 60;
  const totalToday = todaySeconds + (isRunning ? elapsed : 0);
  const pct        = Math.min(100, Math.round((totalToday / Math.max(goalSecs, 1)) * 100));
  const goalMet    = totalToday >= goalSecs;
  const barFilled  = Math.round(pct / 5);   // 20 chars wide
  const bar        = '█'.repeat(barFilled) + '░'.repeat(20 - barFilled);

  return (
    <div className="flex flex-col items-center gap-6 py-6">

      {/* Baby name header */}
      <div className="text-t-muted text-sm tracking-widest uppercase">
        {babyName ? `[ ${babyName} ]` : '[ configure baby name in settings ]'}
      </div>

      {/* ASCII animation */}
      <AsciiAnimation isRunning={isRunning} />

      {/* Timer display */}
      <div className="text-center">
        <div
          className="font-mono text-6xl tracking-widest px-8 py-4 border-2 rounded"
          style={{
            color:        isRunning ? '#00ff88' : '#556655',
            borderColor:  isRunning ? '#00ff88' : '#1a2e20',
            textShadow:   isRunning ? '0 0 20px #00ff8866' : 'none',
            background:   '#0d1a10',
            letterSpacing: '0.15em',
            transition:   'all 0.3s',
          }}
        >
          {fmt(isRunning ? elapsed : 0)}
        </div>
        <div className="text-t-muted text-xs mt-1 tracking-widest">HH : MM : SS</div>
      </div>

      {/* Notes input after stop */}
      {showNotes && (
        <div className="w-full max-w-md border border-t-border rounded p-4 bg-t-card">
          <p className="text-t-gdim text-sm mb-2 tracking-wide">
            ── Session complete! Add a note? ──
          </p>
          <textarea
            autoFocus
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it go? (optional)"
            rows={2}
            className="w-full bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 resize-none focus:outline-none focus:border-t-green"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={saveNote}
              className="flex-1 py-2 rounded text-sm font-mono border border-t-green text-t-green hover:bg-t-gdark transition-colors"
            >
              [ save note ]
            </button>
            <button
              onClick={skipNote}
              className="flex-1 py-2 rounded text-sm font-mono border border-t-border text-t-muted hover:border-t-green hover:text-t-green transition-colors"
            >
              [ skip ]
            </button>
          </div>
        </div>
      )}

      {/* Start/Stop button */}
      {!showNotes && (
        <button
          onClick={toggle}
          disabled={!babyId}
          className="px-12 py-4 rounded font-mono text-lg tracking-widest transition-all duration-200"
          style={{
            background:   isRunning ? '#1a0a0a' : '#0a1a10',
            color:        isRunning ? '#ff4455' : '#00ff88',
            border:       `2px solid ${isRunning ? '#ff4455' : '#00ff88'}`,
            boxShadow:    isRunning ? '0 0 16px #ff445533' : '0 0 16px #00ff8833',
            opacity:      !babyId ? 0.4 : 1,
          }}
        >
          {isRunning ? '[ ■ STOP ]' : '[ ▶ START ]'}
        </button>
      )}

      {/* Spacebar hint */}
      {!showNotes && (
        <div className="text-t-muted text-xs tracking-widest">
          or press <span className="border border-t-muted px-2 py-0.5 rounded text-xs">SPACE</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-t-red text-sm border border-t-red rounded px-4 py-2">
          ⚠ {error}
        </div>
      )}

      {/* Today's progress */}
      <div className="w-full max-w-md border border-t-border rounded p-4 bg-t-card font-mono text-sm">
        <div className="flex justify-between text-t-muted text-xs mb-2">
          <span>TODAY'S PROGRESS</span>
          <span style={{ color: goalMet ? '#00ff88' : '#ffaa00' }}>
            {goalMet ? '✓ GOAL MET' : `${goalMinutes} min goal`}
          </span>
        </div>
        <div className="text-t-muted text-xs mb-1">
          [{bar}] {pct}%
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-t-gdim">
            {Math.floor(totalToday / 60)}m {totalToday % 60}s today
          </span>
          <span className="text-t-muted">
            goal: {goalMinutes}m
          </span>
        </div>
      </div>

    </div>
  );
}
