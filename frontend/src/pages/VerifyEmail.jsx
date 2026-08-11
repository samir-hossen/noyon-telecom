import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'missing'); // verifying | success | error | missing
  const [error, setError] = useState('');
  const { verifyEmail } = useAuth();
  const { t } = useLanguage();

  usePageMeta(t('verifyEmail.pageTitle'), t('verifyEmail.pageMeta'));

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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('verifyEmail.verifying')}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('verifyEmail.oneMoment')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('verifyEmail.verified')}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 26, fontSize: '0.9rem' }}>{t('verifyEmail.verifiedSub')}</p>
            <p className="form-note">
              <Link to="/">{t('verifyEmail.continueShopping')}</Link>
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('verifyEmail.failed')}</h2>
            <div className="form-error">{error}</div>
            <p className="form-note" style={{ marginTop: 16 }}>
              <Link to="/login">{t('nav.signIn')}</Link> {t('verifyEmail.failedNotePost')}
            </p>
          </>
        )}
        {status === 'missing' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>{t('verifyEmail.invalidLink')}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('verifyEmail.invalidLinkSub')}</p>
          </>
        )}
      </div>
    </div>
  );
}
