import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();
  const { t } = useLanguage();

  usePageMeta(t('forgotPw.pageTitle'), t('forgotPw.pageMeta'));

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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('forgotPw.checkEmail')}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
            {t('forgotPw.sentNotePre')} <strong>{email}</strong>{t('forgotPw.sentNotePost')}
          </p>
          <p className="form-note">
            <Link to="/login">{t('forgotPw.backToSignIn')}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('forgotPw.title')}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>
          {t('forgotPw.sub')}
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="fp-email">{t('auth.email')}</label>
            <input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? t('forgotPw.sending') : t('forgotPw.sendLink')}
          </button>
        </form>

        <p className="form-note">
          {t('forgotPw.rememberedPre')} <Link to="/login">{t('nav.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
