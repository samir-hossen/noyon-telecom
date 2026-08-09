import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'missing'); // verifying | success | error | missing
  const [error, setError] = useState('');
  const { verifyEmail } = useAuth();

  usePageMeta('Verify Email', 'Confirm your email address for your Noyon Telecom account.');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
    // Only ever run once per token — verifyEmail intentionally isn't a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        {status === 'verifying' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Verifying your email…</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>One moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Email verified 🎉</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>Your email address is confirmed.</p>
            <p className="form-note">
              <Link to="/">Continue shopping</Link>
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Verification failed</h2>
            <div className="form-error">{error}</div>
            <p className="form-note" style={{ marginTop: 16 }}>
              <Link to="/login">Sign in</Link> and request a new verification email from your account.
            </p>
          </>
        )}
        {status === 'missing' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>Invalid link</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>This verification link is missing its token.</p>
          </>
        )}
      </div>
    </div>
  );
}
