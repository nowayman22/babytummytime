import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearLocal, createLocalStore, exportLocal, hasLocalData } from '../lib/localStore';
import { createRemoteStore, uploadLocalData } from '../lib/remoteStore';
import { chime } from '../lib/sound';
import type { Baby, DailyGoal, Store, TummySession } from '../types';

interface Prefs {
  askNotes: boolean;
  soundOnGoal: boolean;
}

interface AppState {
  user: User | null;
  authLoading: boolean;
  store: Store;
  babies: Baby[];
  activeBaby: Baby | null;
  goal: DailyGoal | null;
  refreshKey: number;

  pendingMigration: boolean;
  migrationBusy: boolean;
  migrationError: string | null;

  prefs: Prefs;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;

  // Timer (lifted so it survives tab switches)
  isRunning: boolean;
  elapsed: number;
  showNotes: boolean;
  notes: string;
  setNotes: (s: string) => void;
  toggleTimer: () => void;
  saveNote: () => Promise<void>;
  skipNote: () => void;
  timerError: string | null;
  todaySeconds: number;

  setActiveBaby: (baby: Baby) => void;
  refresh: () => void;
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>;
  signUp:  (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  uploadLocalToCloud: () => Promise<void>;
  discardLocal: () => void;
}

const AppCtx = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}

const ACTIVE_BABY_KEY = 'btt.active_baby_id';
const PREFS_KEY       = 'btt.prefs';

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { askNotes: p.askNotes ?? true, soundOnGoal: p.soundOnGoal ?? false };
  } catch { return { askNotes: true, soundOnGoal: false }; }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [babies, setBabies]           = useState<Baby[]>([]);
  const [activeBaby, setActiveBabyState] = useState<Baby | null>(null);
  const [goal, setGoal]               = useState<DailyGoal | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [pendingMigration, setPendingMigration] = useState(false);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [prefs, setPrefs]             = useState<Prefs>(loadPrefs);

  // Timer state (lifted)
  const [isRunning, setIsRunning]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [activeSession, setActiveSession] = useState<TummySession | null>(null);
  const [notes, setNotes]                 = useState('');
  const [showNotes, setShowNotes]         = useState(false);
  const [timerError, setTimerError]       = useState<string | null>(null);
  const [todaySeconds, setTodaySeconds]   = useState(0);
  const startRef    = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth bootstrap
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && hasLocalData()) {
        setPendingMigration(true);
      }
      if (event === 'SIGNED_OUT') setPendingMigration(false);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const store = useMemo<Store>(
    () => user ? createRemoteStore(user.id) : createLocalStore(),
    [user],
  );

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [k]: v };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Babies
  useEffect(() => {
    store.listBabies().then(list => {
      setBabies(list);
      const savedId = localStorage.getItem(ACTIVE_BABY_KEY);
      const picked  = list.find(b => b.id === savedId) ?? list[0] ?? null;
      setActiveBabyState(picked);
      if (picked) localStorage.setItem(ACTIVE_BABY_KEY, picked.id);
    }).catch(err => {
      console.error('listBabies', err);
      setBabies([]);
      setActiveBabyState(null);
    });
  }, [store, refreshKey]);

  // Goal
  useEffect(() => {
    if (!activeBaby) { setGoal(null); return; }
    store.getGoal(activeBaby.id).then(setGoal).catch(() => setGoal(null));
  }, [store, activeBaby, refreshKey]);

  // Today's seconds
  useEffect(() => {
    if (!activeBaby) { setTodaySeconds(0); return; }
    store.listSessions(activeBaby.id, 500).then(sessions => {
      const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
      const total = sessions
        .filter(s => new Date(s.started_at) >= startOfDay)
        .reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
      setTodaySeconds(total);
    });
  }, [activeBaby, store, refreshKey]);

  // Realtime sub
  const lastChannelRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (lastChannelRef.current) { lastChannelRef.current(); lastChannelRef.current = null; }
    if (!activeBaby) return;
    lastChannelRef.current = store.subscribe(activeBaby.id, () => refresh());
    return () => { if (lastChannelRef.current) { lastChannelRef.current(); lastChannelRef.current = null; } };
  }, [store, activeBaby, refresh]);

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // ── Timer tick (runs while isRunning, regardless of active tab)
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  // Resume orphan session if any (handles app close mid-session, or returning to tab)
  useEffect(() => {
    if (!activeBaby || isRunning) return;
    let cancelled = false;
    store.getActiveSession(activeBaby.id).then(s => {
      if (cancelled || !s || isRunning) return;
      const started = new Date(s.started_at);
      // Only resume sessions started in the last 24h (avoid resurrecting weeks-old orphans)
      if (Date.now() - started.getTime() > 24 * 60 * 60 * 1000) return;
      setActiveSession(s);
      startRef.current = started;
      setElapsed(Math.floor((Date.now() - started.getTime()) / 1000));
      setIsRunning(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeBaby, store]);

  // Goal-met chime (once per day per baby)
  const totalLive = todaySeconds + (isRunning ? elapsed : 0);
  const goalSecs  = (goal?.target_minutes ?? 30) * 60;
  const prevTotalRef = useRef(0);
  useEffect(() => {
    if (!activeBaby || !prefs.soundOnGoal) { prevTotalRef.current = totalLive; return; }
    if (prevTotalRef.current < goalSecs && totalLive >= goalSecs) {
      const k = `btt.chimed.${activeBaby.id}.${todayKey()}`;
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, '1');
        chime();
      }
    }
    prevTotalRef.current = totalLive;
  }, [totalLive, goalSecs, activeBaby, prefs.soundOnGoal]);

  // Timer actions
  const start = useCallback(async () => {
    if (!activeBaby) { setTimerError('Add a baby in Options first.'); return; }
    setTimerError(null);
    const now = new Date();
    startRef.current = now;
    try {
      const s = await store.startSession(activeBaby.id);
      setActiveSession(s);
      setElapsed(0);
      setIsRunning(true);
      setNotes('');
      setShowNotes(false);
    } catch (e) { setTimerError(e instanceof Error ? e.message : String(e)); }
  }, [activeBaby, store]);

  const finalize = useCallback(async () => {
    if (!activeSession || !startRef.current) return;
    setIsRunning(false);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startRef.current.getTime()) / 1000);
    try {
      await store.endSession(activeSession.id, now.toISOString(), duration);
      if (prefs.askNotes) {
        setShowNotes(true);
      } else {
        setActiveSession(null);
        refresh();
      }
    } catch (e) { setTimerError(e instanceof Error ? e.message : String(e)); }
  }, [activeSession, store, prefs.askNotes, refresh]);

  const toggleTimer = useCallback(() => { if (isRunning) finalize(); else start(); }, [isRunning, finalize, start]);

  const saveNote = useCallback(async () => {
    if (!activeSession) return;
    if (notes.trim()) {
      try { await store.updateSession(activeSession.id, { notes: notes.trim() }); }
      catch (e) { setTimerError(e instanceof Error ? e.message : String(e)); return; }
    }
    setShowNotes(false);
    setActiveSession(null);
    refresh();
  }, [activeSession, notes, store, refresh]);

  const skipNote = useCallback(() => {
    setShowNotes(false);
    setActiveSession(null);
    refresh();
  }, [refresh]);

  // Spacebar listener at app level so it works on any tab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggleTimer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleTimer]);

  const setActiveBaby = useCallback((baby: Baby) => {
    setActiveBabyState(baby);
    localStorage.setItem(ACTIVE_BABY_KEY, baby.id);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(ACTIVE_BABY_KEY);
    setPendingMigration(false);
  }, []);

  const uploadLocalToCloud = useCallback(async () => {
    if (!user) return;
    setMigrationBusy(true);
    setMigrationError(null);
    try {
      await uploadLocalData(user.id, exportLocal());
      clearLocal();
      setPendingMigration(false);
      refresh();
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrationBusy(false);
    }
  }, [user, refresh]);

  const discardLocal = useCallback(() => {
    clearLocal();
    setPendingMigration(false);
    refresh();
  }, [refresh]);

  const value: AppState = {
    user, authLoading, store, babies, activeBaby, goal, refreshKey,
    pendingMigration, migrationBusy, migrationError,
    prefs, setPref,
    isRunning, elapsed, showNotes, notes, setNotes,
    toggleTimer, saveNote, skipNote, timerError, todaySeconds,
    setActiveBaby, refresh, signIn, signUp, signOut,
    uploadLocalToCloud, discardLocal,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
