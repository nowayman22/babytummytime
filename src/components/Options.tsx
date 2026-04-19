import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { chime } from '../lib/sound';
import AuthScreen from './AuthScreen';
import HistoryEditor from './HistoryEditor';

type Section = 'menu' | 'auth' | 'history';

export default function Options() {
  const {
    user, babies, activeBaby, goal, store, refresh,
    setActiveBaby, signOut,
    pendingMigration, migrationBusy, migrationError,
    uploadLocalToCloud, discardLocal,
    prefs, setPref,
  } = useApp();

  const [section, setSection] = useState<Section>('menu');
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState(activeBaby?.name ?? '');
  const [minutes, setMinutes] = useState(goal?.target_minutes ?? 30);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setEditName(activeBaby?.name ?? ''); }, [activeBaby]);
  useEffect(() => { setMinutes(goal?.target_minutes ?? 30); }, [goal]);

  const flash = (msg: string) => { setSavedFlash(msg); setTimeout(() => setSavedFlash(null), 1500); };

  const addBaby = async () => {
    if (!newName.trim()) return;
    try {
      const b = await store.createBaby(newName.trim());
      setNewName('');
      setActiveBaby(b);
      refresh();
      flash('baby added');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const renameBaby = async () => {
    if (!activeBaby || !editName.trim()) return;
    try {
      await store.updateBaby(activeBaby.id, editName.trim());
      refresh();
      flash('name updated');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const removeBaby = async (id: string) => {
    if (!confirm('Delete this baby and all their sessions? This cannot be undone.')) return;
    try {
      await store.deleteBaby(id);
      refresh();
      flash('deleted');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const saveGoal = async () => {
    if (!activeBaby) return;
    try {
      await store.setGoal(activeBaby.id, minutes);
      refresh();
      flash('goal saved');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  if (section === 'auth') return <AuthScreen onClose={() => setSection('menu')} />;
  if (section === 'history') return <HistoryEditor onBack={() => setSection('menu')} />;

  return (
    <div className="py-6 px-2 font-mono max-w-md mx-auto space-y-6">
      {/* migration banner */}
      {pendingMigration && user && (
        <div className="border border-t-green rounded bg-t-gdark p-4 space-y-3">
          <div className="text-t-green text-xs tracking-widest">── LOCAL DATA FOUND ──</div>
          <p className="text-t-text text-sm leading-relaxed">
            You have data saved on this device from before logging in. Upload it to your account, or discard it?
          </p>
          {migrationError && <div className="text-t-red text-xs">⚠ {migrationError}</div>}
          <div className="flex gap-2">
            <button onClick={uploadLocalToCloud} disabled={migrationBusy}
              className="flex-1 py-2 text-xs rounded border border-t-green text-t-green hover:bg-t-green hover:text-t-bg">
              {migrationBusy ? '[ uploading... ]' : '[ upload to cloud ]'}
            </button>
            <button onClick={discardLocal} disabled={migrationBusy}
              className="flex-1 py-2 text-xs rounded border border-t-border text-t-muted hover:border-t-red hover:text-t-red">
              [ discard ]
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNT */}
      <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <div className="text-t-muted text-xs tracking-widest">── ACCOUNT ──</div>
        {user ? (
          <>
            <div className="text-t-text text-sm break-all">{user.email}</div>
            <div className="text-t-gdim text-xs">☁ syncing across devices</div>
            <button onClick={async () => { await signOut(); flash('logged out'); }}
              className="w-full py-2 text-xs rounded border border-t-border text-t-muted hover:border-t-red hover:text-t-red">
              [ log out ]
            </button>
          </>
        ) : (
          <>
            <div className="text-t-muted text-sm">anonymous — data saved locally</div>
            <button onClick={() => setSection('auth')}
              className="w-full py-2 text-xs rounded border border-t-green text-t-green bg-t-gdark hover:bg-t-green hover:text-t-bg">
              [ log in / sign up ]
            </button>
          </>
        )}
      </div>

      {/* CHILDREN */}
      <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <div className="text-t-muted text-xs tracking-widest">── CHILDREN ──</div>

        {babies.length === 0 && (
          <div className="text-t-muted text-xs">no babies yet — add one below</div>
        )}

        {babies.map(b => (
          <div key={b.id}
            className={`flex items-center justify-between rounded px-3 py-2 border ${
              activeBaby?.id === b.id ? 'border-t-green bg-t-gdark' : 'border-t-border'
            }`}
          >
            <button
              onClick={() => setActiveBaby(b)}
              className="flex-1 text-left text-sm"
              style={{ color: activeBaby?.id === b.id ? '#00ff88' : '#d4d4d4' }}
            >
              {activeBaby?.id === b.id ? '▶ ' : '  '}{b.name}
            </button>
            <button
              onClick={() => removeBaby(b.id)}
              className="text-t-muted text-xs hover:text-t-red px-2"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="flex gap-2 pt-2 border-t border-t-border">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="new baby name"
            maxLength={40}
            className="flex-1 bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 focus:outline-none focus:border-t-green"
          />
          <button onClick={addBaby}
            className="px-4 text-xs rounded border border-t-green text-t-green hover:bg-t-green hover:text-t-bg">
            + add
          </button>
        </div>

        {activeBaby && (
          <div className="flex gap-2 pt-2 border-t border-t-border">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="rename active baby"
              maxLength={40}
              className="flex-1 bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 focus:outline-none focus:border-t-green"
            />
            <button onClick={renameBaby}
              className="px-4 text-xs rounded border border-t-border text-t-muted hover:border-t-green hover:text-t-green">
              rename
            </button>
          </div>
        )}
      </div>

      {/* GOAL */}
      {activeBaby && (
        <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
          <div className="text-t-muted text-xs tracking-widest">── DAILY GOAL ──</div>
          <div className="flex items-center gap-4">
            <input type="range" min={5} max={120} step={5}
              value={minutes}
              onChange={e => setMinutes(Number(e.target.value))}
              className="flex-1 accent-t-green" />
            <span className="text-t-green text-2xl w-16 text-right">{minutes}m</span>
          </div>
          <button onClick={saveGoal}
            className="w-full py-2 text-xs rounded border border-t-green text-t-green bg-t-gdark hover:bg-t-green hover:text-t-bg">
            [ save goal ]
          </button>
        </div>
      )}

      {/* PREFERENCES */}
      <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <div className="text-t-muted text-xs tracking-widest">── PREFERENCES ──</div>

        <label className="flex items-center justify-between text-sm cursor-pointer">
          <span className="text-t-text">Ask for notes after each session</span>
          <input
            type="checkbox"
            checked={prefs.askNotes}
            onChange={e => setPref('askNotes', e.target.checked)}
            className="accent-t-green w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between text-sm cursor-pointer">
          <span className="text-t-text">Play sound when daily goal is met</span>
          <input
            type="checkbox"
            checked={prefs.soundOnGoal}
            onChange={e => setPref('soundOnGoal', e.target.checked)}
            className="accent-t-green w-4 h-4"
          />
        </label>

        {prefs.soundOnGoal && (
          <button onClick={chime}
            className="w-full py-1 text-xs rounded border border-t-border text-t-muted hover:border-t-green hover:text-t-green">
            ♪ test sound
          </button>
        )}
      </div>

      {/* HISTORY EDITOR */}
      {activeBaby && (
        <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
          <div className="text-t-muted text-xs tracking-widest">── HISTORY ──</div>
          <button onClick={() => setSection('history')}
            className="w-full py-2 text-xs rounded border border-t-border text-t-muted hover:border-t-green hover:text-t-green">
            [ edit / delete sessions ]
          </button>
        </div>
      )}

      {savedFlash && (
        <div className="text-t-green text-xs text-center">✓ {savedFlash}</div>
      )}
      {err && (
        <div className="text-t-red text-xs border border-t-red rounded px-3 py-2">⚠ {err}</div>
      )}

      <div className="text-t-muted text-xs text-center pt-2">
        v0.4.1 · {user ? 'cloud' : 'local only'}
      </div>
    </div>
  );
}
