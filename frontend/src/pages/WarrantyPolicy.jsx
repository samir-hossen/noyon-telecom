import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

// [[ EDIT: this whole page is starter/template content — replace the
// [[ EDIT: ... ]] markers inside translations.js's warranty.* keys with your
// real numbers before treating this as final. See RefundPolicy.jsx for the
// same pattern already in use on this site. ]]
const LAST_UPDATED = 'September 2026'; // update manually when this text changes — see Terms.jsx for why

export default function WarrantyPolicy() {
  const { t } = useLanguage();
  usePageMeta(t('warranty.pageTitle'), t('warranty.pageMeta'));
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('terms.legal')}</span>
        <h1 className="page-title">{t('warranty.titleTop')} <em>{t('warranty.titleEm')}</em> {t('warranty.titlePost')}</h1>
      </div>
      <div className="legal-content">
        <p><em>{t('terms.lastUpdated', null, { date: LAST_UPDATED })}</em></p>

        <h3>{t('warranty.s1Title')}</h3>
        <p>{t('warranty.s1Body', null, { days: t('warranty.s1Days') })}</p>

        <h3>{t('warranty.s2Title')}</h3>
        <ul>
          <li>{t('warranty.s2Item1')}</li>
          <li>{t('warranty.s2Item2')}</li>
          <li>{t('warranty.s2Item3')}</li>
        </ul>

        <h3>{t('warranty.s3Title')}</h3>
        <ul>
          <li>{t('warranty.s3Item1')}</li>
          <li>{t('warranty.s3Item2')}</li>
          <li>{t('warranty.s3Item3')}</li>
          <li>{t('warranty.s3Item4')}</li>
        </ul>

        <h3>{t('warranty.s4Title')}</h3>
        <ol>
          {/* {{days}} lands in a different one of these two strings per
              language (English: Post, Bangla: Pre) — passed to both calls
              since an unused interpolation param is a harmless no-op. */}
          <li>{t('warranty.s4Step1Pre', null, { days: t('warranty.s1Days') })} <Link to="/contact">{t('terms.s10Link')}</Link> {t('warranty.s4Step1Post', null, { days: t('warranty.s1Days') })}</li>
          <li>{t('warranty.s4Step2')}</li>
          <li>{t('warranty.s4Step3')}</li>
        </ol>

        <h3>{t('warranty.s5Title')}</h3>
        <p>{t('warranty.s5Body')}</p>

        <h3>{t('warranty.s6Title')}</h3>
        <p>
          {t('warranty.s6BodyPre')} <Link to="/contact">{t('terms.s10Link')}</Link> {t('warranty.s6BodyPost')}
        </p>
      </div>
    </div>
  );
}
