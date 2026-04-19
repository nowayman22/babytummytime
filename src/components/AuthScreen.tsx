import { useState } from 'react';
import { useApp } from '../context/AppContext';

interface Props {
  onClose: () => void;
}

export default function AuthScreen({ onClose }: Props) {
  const { signIn, signUp } = useApp();
  const [mode, setMode]       = useState<'login' | 'signup'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPwd]    = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      setError('Email + password (6+ chars) required.');
      return;
    }
    setBusy(true); setError(null);
    const fn = mode === 'login' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="py-6 px-2 font-mono max-w-md mx-auto space-y-4">
      <div className="text-t-muted text-xs tracking-widest">── {mode === 'login' ? 'LOG IN' : 'SIGN UP'} ──</div>

      <form onSubmit={submit} className="border border-t-border rounded bg-t-card p-4 space-y-3">
        <label className="block text-t-muted text-xs tracking-widest">EMAIL</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email"
          className="w-full bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 focus:outline-none focus:border-t-green"
        />
        <label className="block text-t-muted text-xs tracking-widest">PASSWORD</label>
        <input
          type="password" value={password} onChange={e => setPwd(e.target.value)}
          placeholder="6+ characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full bg-t-bg border border-t-border text-t-text text-sm rounded px-3 py-2 focus:outline-none focus:border-t-green"
        />
        <button
          type="submit" disabled={busy}
          className="w-full py-2 rounded text-sm tracking-widest border border-t-green text-t-green bg-t-gdark hover:bg-t-green hover:text-t-bg transition-colors"
        >
          {busy ? '[ ... ]' : mode === 'login' ? '[ log in ]' : '[ create account ]'}
        </button>
      </form>

      {error && (
        <div className="text-t-red text-xs border border-t-red rounded px-3 py-2">⚠ {error}</div>
      )}

      <button
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
        className="w-full text-center text-t-muted text-xs hover:text-t-green"
      >
        {mode === 'login' ? 'no account? → sign up' : 'already have an account? → log in'}
      </button>

      <button
        onClick={onClose}
        className="w-full text-center text-t-muted text-xs hover:text-t-green py-2"
      >
        continue without account (local only)
      </button>

      <div className="text-t-muted text-xs text-center pt-2 leading-relaxed">
        Signed-in users sync across devices.<br />
        Anonymous users store data locally on this device only.
      </div>
    </div>
  );
}
