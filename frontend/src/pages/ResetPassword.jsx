import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

  usePageMeta(t('resetPw.pageTitle'), t('resetPw.pageMeta'));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!token) return setError(t('resetPw.missingToken'));
    if (password.length < 6) return setError(t('register.passwordMinLength'));
    if (password !== confirm) return setError(t('resetPw.passwordMismatch'));

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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('resetPw.invalidLink')}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            {t('resetPw.invalidLinkSub')}
          </p>
          <p className="form-note">
            <Link to="/forgot-password">{t('resetPw.requestNewLink')}</Link>
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('resetPw.updated')}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            {t('resetPw.updatedSub')}
          </p>
          <p className="form-note">
            <Link to="/login">{t('resetPw.signInNow')}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('resetPw.title')}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>{t('resetPw.sub')}</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="rp-password">{t('resetPw.newPassword')}</label>
            <input
              id="rp-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('register.passwordPlaceholder')}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="rp-confirm">{t('resetPw.confirmPassword')}</label>
            <input id="rp-confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? t('resetPw.updating') : t('resetPw.updateBtn')}
          </button>
        </form>

        <p className="form-note">
          <Link to="/login">{t('forgotPw.backToSignIn')}</Link>
        </p>
      </div>
    </div>
  );
}
