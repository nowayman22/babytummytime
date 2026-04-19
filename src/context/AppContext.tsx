import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearLocal, createLocalStore, exportLocal, hasLocalData } from '../lib/localStore';
import { createRemoteStore, uploadLocalData } from '../lib/remoteStore';
import type { Baby, DailyGoal, Store } from '../types';

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

  // Store depends on auth state
  const store = useMemo<Store>(
    () => user ? createRemoteStore(user.id) : createLocalStore(),
    [user],
  );

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Load babies when store changes or refresh fires
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

  // Load goal for active baby
  useEffect(() => {
    if (!activeBaby) { setGoal(null); return; }
    store.getGoal(activeBaby.id).then(setGoal).catch(() => setGoal(null));
  }, [store, activeBaby, refreshKey]);

  // Subscribe to changes for active baby
  const lastChannelRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (lastChannelRef.current) { lastChannelRef.current(); lastChannelRef.current = null; }
    if (!activeBaby) return;
    lastChannelRef.current = store.subscribe(activeBaby.id, () => refresh());
    return () => { if (lastChannelRef.current) { lastChannelRef.current(); lastChannelRef.current = null; } };
  }, [store, activeBaby, refresh]);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

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
    setActiveBaby, refresh, signIn, signUp, signOut,
    uploadLocalToCloud, discardLocal,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
