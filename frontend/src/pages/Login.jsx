import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

  usePageMeta(t('nav.signIn'), t('auth.signInMeta'));

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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('auth.twoFATitle')}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            {t('auth.twoFASub')}
          </p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={onVerify}>
            <div className="field">
              <label htmlFor="twofa-code">{t('auth.verificationCode')}</label>
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
              {busy ? t('auth.verifying') : t('auth.verify')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('auth.welcomeBack')}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>{t('auth.signInSub')}</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-email">{t('auth.email')}</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t('auth.password')}</label>
            <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <p style={{ textAlign: 'right', marginTop: -10, marginBottom: 18 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem' }}>{t('auth.forgotPassword')}</Link>
          </p>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? t('auth.signingIn') : t('nav.signIn')}
          </button>
        </form>

        <p className="form-note">
          {t('auth.newHerePre')} <Link to="/register">{t('auth.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
