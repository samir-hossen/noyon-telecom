import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  usePageMeta('Forgot Password', 'Reset the password for your Noyon Telecom account.');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await forgotPassword(email);
      // Always show the same success message, whether or not the email is
      // registered — this page never confirms which emails have accounts.
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Check your email</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in 30 minutes.
          </p>
          <p className="form-note">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Forgot your password?</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
          Enter your account email and we'll send you a link to reset it.
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="fp-email">Email</label>
            <input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="form-note">
          Remembered it? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
