import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

// Fixed, not `new Date()` — a "Last updated" date must reflect when the
// text actually last changed. Update this string yourself whenever you
// revise the policy below; a date that silently becomes "today" on every
// page load is misleading (and a bad look if this is ever scrutinized).
const LAST_UPDATED = 'August 2026';

export default function Terms() {
  const { t } = useLanguage();
  usePageMeta(t('terms.pageTitle'), t('terms.pageMeta'));
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('terms.legal')}</span>
        <h1 className="page-title">{t('terms.titleTop')} <em>{t('terms.titleEm')}</em></h1>
      </div>
      <div className="legal-content">
        <p><em>{t('terms.lastUpdated', null, { date: LAST_UPDATED })}</em></p>

        <h3>{t('terms.s1Title')}</h3>
        <p>{t('terms.s1Body')}</p>

        <h3>{t('terms.s2Title')}</h3>
        <p>{t('terms.s2Body')}</p>

        <h3>{t('terms.s3Title')}</h3>
        <p>{t('terms.s3Body')}</p>

        <h3>{t('terms.s4Title')}</h3>
        <p>{t('terms.s4Body')}</p>

        <h3>{t('terms.s5Title')}</h3>
        <p>{t('terms.s5Body')}</p>

        <h3>{t('terms.s6Title')}</h3>
        <p>
          {t('terms.s6BodyPre')} <Link to="/refund-policy">{t('terms.s6Link')}</Link> {t('terms.s6BodyPost')}
        </p>

        <h3>{t('terms.s7Title')}</h3>
        <p>{t('terms.s7Body')}</p>

        <h3>{t('terms.s8Title')}</h3>
        <p>{t('terms.s8Body')}</p>

        <h3>{t('terms.s9Title')}</h3>
        <p>{t('terms.s9Body')}</p>

        <h3>{t('terms.s10Title')}</h3>
        <p>
          {t('terms.s10BodyPre')} <Link to="/contact">{t('terms.s10Link')}</Link>.
        </p>

        <p className="legal-note">
          {t('terms.legalNote')}
        </p>
      </div>
    </div>
  );
}
