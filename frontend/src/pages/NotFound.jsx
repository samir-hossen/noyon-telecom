import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  usePageMeta(t('notFound.title'), "The page you're looking for doesn't exist or may have moved.", null, null, null, true);

  return (
    <div className="container">
      <div className="empty-state">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem' }}>404</h1>
        <p style={{ marginBottom: 24 }}>{t('notFound.message')}</p>
        <Link to="/" className="btn btn-primary">{t('notFound.backHome')}</Link>
      </div>
    </div>
  );
}
