import { useState } from 'react';
import { friendlyAuthError } from '../lib/authErrors';
import type { CloudSync, SyncStatus } from '../lib/useCloudSync';

const STATUS_TEXT: Record<SyncStatus, string> = {
  off: 'Not set up',
  loading: 'Loading…',
  'signed-out': 'Signed out',
  connecting: 'Syncing…',
  synced: 'Backed up',
  pending: 'Saved on this phone — syncs when you are online',
  error: 'Sync problem',
};

export default function CloudCard({ sync }: { sync: CloudSync }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (sync.status === 'off') {
    return (
      <div className="card">
        <h2>Cloud backup</h2>
        <p className="muted small">Not set up yet. Your data is saved on this phone only — use Export below for backups.</p>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (sync.email) {
    return (
      <div className="card">
        <h2>Cloud backup</h2>
        <p className={`sync-status ${sync.status}`}>
          <span aria-hidden="true">{sync.status === 'synced' ? '✓' : sync.status === 'error' ? '!' : '↻'}</span>{' '}
          {STATUS_TEXT[sync.status]}
        </p>
        <p className="muted small">
          Signed in as {sync.email}
          {sync.lastSynced ? ` · last synced ${new Date(sync.lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
        </p>
        {sync.error && <p className="note">{sync.error}</p>}
        <button className="ghost" onClick={() => run(sync.signOut)} disabled={busy}>
          Sign out
        </button>
      </div>
    );
  }

  const valid = email.includes('@') && password.length >= 6;

  return (
    <div className="card">
      <h2>Cloud backup</h2>
      <p className="muted small">
        Sign in to back up your workouts and use them on other devices. Everything still works offline.
      </p>
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) run(() => sync.signIn(email.trim(), password));
        }}
      >
        <label>
          <span className="field-label">Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="btn-row">
          <button className="primary" type="submit" disabled={busy || !valid}>
            Sign in
          </button>
          <button
            className="secondary"
            type="button"
            disabled={busy || !valid}
            onClick={() => run(() => sync.signUp(email.trim(), password))}
          >
            Create account
          </button>
        </div>
        <button
          className="ghost small"
          type="button"
          disabled={busy || !email.includes('@')}
          onClick={() => run(() => sync.resetPassword(email.trim()), 'Password reset email sent.')}
        >
          Forgot password?
        </button>
      </form>
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}
