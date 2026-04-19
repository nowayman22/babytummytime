import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TummySession } from '../types';

export function useTimer(babyId: string | null, onSessionSaved: () => void) {
  const [isRunning, setIsRunning]       = useState(false);
  const [elapsed, setElapsed]           = useState(0);        // seconds
  const [activeSession, setActiveSession] = useState<TummySession | null>(null);
  const [notes, setNotes]               = useState('');
  const [showNotes, setShowNotes]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<Date | null>(null);

  // Tick while running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Spacebar to toggle
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

  const toggle = () => {
    if (isRunning) stop();
    else start();
  };

  const start = async () => {
    if (!babyId) {
      setError('No baby profile — go to Settings first.');
      return;
    }
    setError(null);
    const now = new Date();
    startRef.current = now;

    const { data, error: err } = await supabase
      .from('tummy_sessions')
      .insert({ baby_id: babyId, started_at: now.toISOString() })
      .select()
      .single();

    if (err) { setError(err.message); return; }
    setActiveSession(data);
    setElapsed(0);
    setIsRunning(true);
    setNotes('');
    setShowNotes(false);
  };

  const stop = async () => {
    if (!activeSession || !startRef.current) return;
    setIsRunning(false);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startRef.current.getTime()) / 1000);

    await supabase
      .from('tummy_sessions')
      .update({ ended_at: now.toISOString(), duration_seconds: duration })
      .eq('id', activeSession.id);

    setShowNotes(true);
  };

  const saveNote = async () => {
    if (!activeSession) return;
    if (notes.trim()) {
      await supabase
        .from('tummy_sessions')
        .update({ notes: notes.trim() })
        .eq('id', activeSession.id);
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

  return {
    isRunning, elapsed, showNotes, notes, setNotes,
    toggle, saveNote, skipNote, error,
  };
}
