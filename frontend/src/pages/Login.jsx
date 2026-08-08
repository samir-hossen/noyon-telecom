import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [code, setCode] = useState('');
  const { login, verifyTwoFA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  usePageMeta('Sign In', 'Sign in to your Noyon Telecom account to track orders and manage your wishlist.');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      if (result.twoFARequired) {
        setPendingId(result.pendingId);
      } else {
        navigate(location.state?.from || '/');
      }
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
      await verifyTwoFA(pendingId, code);
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (pendingId) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Two-factor code</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            Enter the 6-digit code from your authenticator app.
          </p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={onVerify}>
            <div className="field">
              <label htmlFor="twofa-code">Verification code</label>
              <input
                id="twofa-code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
              />
            </div>
            <button className="btn btn-berry btn-block" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Welcome back</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>Sign in to continue shopping.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <p style={{ textAlign: 'right', marginTop: -10, marginBottom: 18 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem' }}>Forgot password?</Link>
          </p>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="form-note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
