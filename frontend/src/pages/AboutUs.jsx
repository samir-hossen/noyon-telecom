import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

// Everything in double-bracket comments below ([[ EDIT: ... ]]) is a
// placeholder — swap it for your real numbers/story before going live.
// Specific, honest details (a real year founded, a real warehouse address,
// a real trade license number) are what make an About page actually build
// trust with a dealer deciding whether to wire you money; generic
// boilerplate does the opposite; a wholesale buyer who catches even one
// fabricated claim (a made-up "10,000+ orders" figure, a stock photo
// presented as your warehouse) stops trusting everything else on the page.
export default function AboutUs() {
  const { t } = useLanguage();
  usePageMeta(t('about.pageTitle'), t('about.pageMeta'));

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('about.eyebrow')}</span>
        <h1 className="page-title">
          {t('about.titleTop')} <em>{t('about.titleEm')}</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 620 }}>
          {t('about.intro')}
        </p>
      </div>

      <div className="form-panel wide" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>{t('about.ourStory')}</h3>
        <p style={{ lineHeight: 1.7, color: '#4a413c' }}>
          {t('about.storyText')}
        </p>
      </div>

      <div className="cards-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>🔧 {t('about.whatWeDo')}</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            {t('about.whatWeDoText')}
          </p>
        </div>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>✅ {t('about.qualityChecks')}</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            {t('about.qualityChecksText')}
          </p>
        </div>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>🤝 {t('about.whoWeServe')}</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            {t('about.whoWeServeText')}
          </p>
        </div>
      </div>

      <div className="form-panel wide" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 16 }}>{t('about.whyChooseUs')}</h3>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, listStyle: 'none', padding: 0, margin: 0 }}>
          <li>📦 &nbsp;{t('about.reasonCatalog')}</li>
          <li>💳 &nbsp;{t('about.reasonPricing')}</li>
          <li>🚚 &nbsp;{t('about.reasonDelivery')}</li>
          <li>💬 &nbsp;{t('about.reasonSupport')}</li>
          <li>🛡️ &nbsp;{t('about.reasonWarranty')}</li>
          <li>
            🏢 &nbsp;{t('about.reasonLicense')}
          </li>
        </ul>
      </div>

      <div className="form-panel wide" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: 10 }}>{t('about.readyTitle')}</h3>
        <p style={{ color: '#6b5f59', marginBottom: 20 }}>
          {t('about.readySub')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn btn-berry">
            {t('about.browseCatalog')}
          </Link>
          <Link to="/request-quote" className="btn btn-outline">
            {t('footer.requestBulkQuote')}
          </Link>
          <Link to="/contact" className="btn btn-outline">
            {t('footer.contactUsLower')}
          </Link>
        </div>
      </div>
    </div>
  );
}
