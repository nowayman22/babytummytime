import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Baby, DailyGoal } from '../types';

interface Props {
  baby: Baby | null;
  goal: DailyGoal | null;
  onSaved: (baby: Baby, goal: DailyGoal) => void;
}

export default function Settings({ baby, goal, onSaved }: Props) {
  const [name, setName]           = useState(baby?.name ?? '');
  const [minutes, setMinutes]     = useState(goal?.target_minutes ?? 30);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) { setError('Baby name is required.'); return; }
    setSaving(true);
    setError(null);

    let babyRecord = baby;

    if (!baby) {
      // Create new baby
      const { data, error: err } = await supabase
        .from('babies')
        .insert({ name: name.trim() })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      babyRecord = data;
    } else {
      // Update name
      const { data, error: err } = await supabase
        .from('babies')
        .update({ name: name.trim() })
        .eq('id', baby.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      babyRecord = data;
    }

    if (!babyRecord) return;

    let goalRecord = goal;

    if (!goal) {
      const { data, error: err } = await supabase
        .from('daily_goals')
        .insert({ baby_id: babyRecord.id, target_minutes: minutes })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      goalRecord = data;
    } else {
      const { data, error: err } = await supabase
        .from('daily_goals')
        .update({ target_minutes: minutes })
        .eq('id', goal.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      goalRecord = data;
    }

    if (!goalRecord) return;

    // Persist baby_id locally
    localStorage.setItem('baby_id', babyRecord.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved(babyRecord, goalRecord);
  };

  return (
    <div className="py-6 px-2 font-mono max-w-md mx-auto space-y-6">

      <div className="text-t-muted text-xs tracking-widest">── CONFIGURATION ──</div>

      {/* Baby name */}
      <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <label className="block text-t-muted text-xs tracking-widest">BABY NAME</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Luna, Theo, Sam..."
          maxLength={40}
          className="w-full bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 focus:outline-none focus:border-t-green transition-colors"
        />
      </div>

      {/* Daily goal */}
      <div className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <label className="block text-t-muted text-xs tracking-widest">DAILY GOAL (MINUTES)</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={5} max={120} step={5}
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            className="flex-1 accent-t-green"
          />
          <span className="text-t-green text-2xl w-16 text-right">{minutes}m</span>
        </div>
        <div className="text-t-muted text-xs">
          {minutes < 15 && 'Starting out — every minute counts!'}
          {minutes >= 15 && minutes < 30 && 'Good foundation — building the habit.'}
          {minutes >= 30 && minutes < 60 && 'Recommended: 30+ min/day for most babies.'}
          {minutes >= 60 && 'Power session — excellent tummy time goal!'}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded text-sm tracking-widest border transition-all duration-200"
        style={{
          background:  saved ? '#003311' : '#0a1a10',
          color:       saved ? '#00ff88' : '#00cc66',
          borderColor: saved ? '#00ff88' : '#00aa55',
          boxShadow:   saved ? '0 0 12px #00ff8833' : 'none',
        }}
      >
        {saving ? '[ saving... ]' : saved ? '[ ✓ saved! ]' : '[ save settings ]'}
      </button>

      {error && (
        <div className="text-t-red text-xs border border-t-red rounded px-3 py-2">
          ⚠ {error}
        </div>
      )}

      {/* Info */}
      <div className="border border-t-border rounded bg-t-card p-4 text-xs text-t-muted space-y-1">
        <div className="text-t-gdim mb-2">── ABOUT ──</div>
        <div>Baby Tummy Time Tracker</div>
        <div>Data stored in Supabase</div>
        <div className="pt-2 text-t-muted break-all">
          db: njeoajkmpyyaromujxfm.supabase.co
        </div>
      </div>

    </div>
  );
}
