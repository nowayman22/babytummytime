import { useEffect, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AppProvider, useApp } from './context/AppContext';
import Timer from './components/Timer';
import SessionList from './components/SessionList';
import Stats from './components/Stats';
import Options from './components/Options';

type Tab = 'timer' | 'history' | 'stats' | 'options';

const TABS: { id: Tab; label: string }[] = [
  { id: 'timer',   label: '[ TIMER ]'   },
  { id: 'history', label: '[ HISTORY ]' },
  { id: 'stats',   label: '[ STATS ]'   },
  { id: 'options', label: '[ OPTIONS ]' },
];

function AppInner() {
  const { activeBaby, store, user, authLoading, refreshKey, pendingMigration } = useApp();
  const [tab, setTab]                 = useState<Tab>('timer');
  const [todaySeconds, setTodaySeconds] = useState(0);

  useEffect(() => {
    if (!activeBaby) { setTodaySeconds(0); return; }
    const today = new Date();
    store.listSessions(activeBaby.id, 500).then(sessions => {
      const total = sessions
        .filter(s => {
          const t = new Date(s.started_at);
          return t >= startOfDay(today) && t <= endOfDay(today);
        })
        .reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
      setTodaySeconds(total);
    });
  }, [activeBaby, store, refreshKey]);

  if (authLoading) return (
    <div className="min-h-screen bg-t-bg flex items-center justify-center font-mono text-t-muted">
      <div className="animate-pulse">loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-t-bg text-t-text font-mono flex flex-col select-none">
      <header className="border-b border-t-border px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-t-green text-lg" style={{ textShadow: '0 0 10px #00ff8844' }}>
          🐰 Baby Tummy Time
        </span>
        <div className="text-xs flex items-center gap-3">
          {activeBaby
            ? <span className="text-t-gdim">[ {activeBaby.name} ]</span>
            : <span className="text-t-red">[ setup required ]</span>}
          <span className="text-t-muted hidden sm:inline">{format(new Date(), 'EEE, MMM d')}</span>
          <span className="text-t-muted" title={user ? user.email ?? 'cloud' : 'local only'}>
            {user ? '☁' : '⊙'}
          </span>
        </div>
      </header>

      <nav className="border-b border-t-border flex shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-xs tracking-widest transition-all duration-150 relative"
            style={{
              color:        tab === t.id ? '#00ff88' : '#556655',
              background:   tab === t.id ? '#0a1a10' : 'transparent',
              borderBottom: tab === t.id ? '2px solid #00ff88' : '2px solid transparent',
            }}>
            {t.label}
            {t.id === 'options' && pendingMigration && (
              <span className="absolute top-1 right-2 text-t-green">●</span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full">
        {tab === 'timer'   && <Timer todaySeconds={todaySeconds} onSessionSaved={() => {}} />}
        {tab === 'history' && <SessionList />}
        {tab === 'stats'   && <Stats />}
        {tab === 'options' && <Options />}
      </main>

      <footer className="border-t border-t-border px-4 py-2 flex justify-between text-xs text-t-muted shrink-0">
        <span className="hidden sm:inline">SPACE to start / stop</span>
        <span className="sm:hidden">tap to track</span>
        <span style={{ color: '#1a3a22' }}>v0.4.0</span>
      </footer>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>;
}
