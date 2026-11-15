import { GOOGLE_REVIEW_URL } from '../content/businessInfo.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function GoogleReviewPrompt({ compact = false }) {
  const { t } = useLanguage();

  return (
    <div
      className="card"
      style={{
        padding: compact ? '14px 16px' : '18px 20px',
        marginTop: 16,
        textAlign: 'left',
        borderColor: '#d9e8dc',
        background: '#f8fcf8',
      }}
    >
      <strong>{t('reviews.googleTitle')}</strong>
      <p style={{ color: 'var(--muted)', margin: '6px 0 12px', fontSize: '0.88rem' }}>
        {t('reviews.googleBody')}
      </p>
      <a className="btn btn-outline" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">
        ★ {t('reviews.googleButton')}
      </a>
    </div>
  );
}
