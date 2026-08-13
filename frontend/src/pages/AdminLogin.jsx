import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [code, setCode] = useState('');
  const { login, verifyTwoFA, logout } = useAuth();
  const navigate = useNavigate();

  usePageMeta('Admin Login', 'Staff sign-in for the Noyon Telecom admin dashboard.');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      if (result.twoFARequired) {
        setPendingId(result.pendingId);
        return;
      }
      if (result.user.role !== 'admin') {
        await logout();
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await verifyTwoFA(pendingId, code);
      if (user.role !== 'admin') {
        await logout();
        // Without resetting these, `pendingId` stays truthy and the
        // component keeps rendering the 2FA-code screen (see the
        // `if (pendingId)` gate below) even though `logout()` just cleared
        // the session — the user would be stuck there needing a page
        // refresh to get back to the email/password form.
        setPendingId(null);
        setCode('');
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (pendingId) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel" style={{ borderColor: 'var(--ink)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Two-factor code</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            Enter the 6-digit code from your authenticator app.
          </p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={onVerify}>
            <div className="field">
              <label>Verification code</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel" style={{ borderColor: 'var(--ink)' }}>
        <span className="eyebrow">Staff access</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: '8px 0 6px' }}>Admin sign in</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
          Restricted area — for store administrators only.
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Admin email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourstore.com" autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to admin panel'}
          </button>
        </form>

        <p className="form-note">
          <Link to="/login">Customer sign in →</Link>
        </p>
      </div>
    </div>
  );
}
