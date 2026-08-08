import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  usePageMeta('Reset Password', 'Set a new password for your Noyon Telecom account.');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!token) return setError('This reset link is missing its token. Please request a new one.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setError('Password must include at least one letter and one number.');
    }
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Invalid link</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            This password reset link is missing or malformed.
          </p>
          <p className="form-note">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Password updated</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            Your password has been changed. Redirecting you to sign in…
          </p>
          <p className="form-note">
            <Link to="/login">Sign in now</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Set a new password</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>Choose a new password for your account.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="rp-password">New password</label>
            <input
              id="rp-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters, with a letter and number"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="rp-confirm">Confirm new password</label>
            <input id="rp-confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="form-note">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
