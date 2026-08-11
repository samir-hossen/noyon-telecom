import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

const LAST_UPDATED = 'August 2026'; // update manually when this text changes — see Terms.jsx for why

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  usePageMeta(t('privacy.pageTitle'), t('privacy.pageMeta'));
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('terms.legal')}</span>
        <h1 className="page-title">{t('privacy.titleTop')} <em>{t('privacy.titleEm')}</em></h1>
      </div>
      <div className="legal-content">
        <p><em>{t('terms.lastUpdated', null, { date: LAST_UPDATED })}</em></p>

        <h3>{t('privacy.s1Title')}</h3>
        <p>{t('privacy.s1Body')}</p>

        <h3>{t('privacy.s2Title')}</h3>
        <ul>
          <li>{t('privacy.s2Item1')}</li>
          <li>{t('privacy.s2Item2')}</li>
          <li>{t('privacy.s2Item3')}</li>
          <li>{t('privacy.s2Item4')}</li>
          <li>{t('privacy.s2Item5')}</li>
        </ul>

        <h3>{t('privacy.s3Title')}</h3>
        <p>{t('privacy.s3Body')}</p>

        <h3>{t('privacy.s4Title')}</h3>
        <p>{t('privacy.s4Body')}</p>

        <h3>{t('privacy.s5Title')}</h3>
        <p>{t('privacy.s5Body')}</p>

        <h3>{t('privacy.s6Title')}</h3>
        <p>{t('privacy.s6Body')}</p>

        <h3>{t('privacy.s7Title')}</h3>
        <p>
          {t('privacy.s7BodyPre')}{' '}
          <Link to="/contact">{t('terms.s10Link')}</Link>.
        </p>

        <p className="legal-note">
          {t('privacy.legalNote')}
        </p>
      </div>
    </div>
  );
}
