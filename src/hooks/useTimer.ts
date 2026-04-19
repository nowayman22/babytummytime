import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TummySession } from '../types';

export function useTimer(onSessionSaved: () => void) {
  const { store, activeBaby } = useApp();

  const [isRunning, setIsRunning]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [activeSession, setActiveSession] = useState<TummySession | null>(null);
  const [notes, setNotes]                 = useState('');
  const [showNotes, setShowNotes]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<Date | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const start = async () => {
    if (!activeBaby) { setError('Add a baby in Options first.'); return; }
    setError(null);
    const now = new Date();
    startRef.current = now;
    try {
      const s = await store.startSession(activeBaby.id);
      setActiveSession(s);
      setElapsed(0);
      setIsRunning(true);
      setNotes('');
      setShowNotes(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const stop = async () => {
    if (!activeSession || !startRef.current) return;
    setIsRunning(false);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startRef.current.getTime()) / 1000);
    try {
      await store.endSession(activeSession.id, now.toISOString(), duration);
      setShowNotes(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const toggle = () => { if (isRunning) stop(); else start(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const saveNote = async () => {
    if (!activeSession) return;
    if (notes.trim()) {
      try { await store.updateSession(activeSession.id, { notes: notes.trim() }); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); return; }
    }
    setShowNotes(false);
    setActiveSession(null);
    onSessionSaved();
  };

  const skipNote = () => {
    setShowNotes(false);
    setActiveSession(null);
    onSessionSaved();
  };

  return { isRunning, elapsed, showNotes, notes, setNotes, toggle, saveNote, skipNote, error };
}
