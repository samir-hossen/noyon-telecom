import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

// [[ EDIT: this whole page is starter/template content — replace the
// [[ EDIT: ... ]] markers inside translations.js's delivery.* keys with your
// real delivery areas/timelines/charges before treating this as final. ]]
const LAST_UPDATED = 'September 2026'; // update manually when this text changes — see Terms.jsx for why

export default function DeliveryPolicy() {
  const { t } = useLanguage();
  usePageMeta(t('delivery.pageTitle'), t('delivery.pageMeta'));
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('terms.legal')}</span>
        <h1 className="page-title">{t('delivery.titleTop')} <em>{t('delivery.titleEm')}</em> {t('delivery.titlePost')}</h1>
      </div>
      <div className="legal-content">
        <p><em>{t('terms.lastUpdated', null, { date: LAST_UPDATED })}</em></p>

        <h3>{t('delivery.s1Title')}</h3>
        <p>{t('delivery.s1Body')}</p>

        <h3>{t('delivery.s2Title')}</h3>
        <ul>
          <li>{t('delivery.s2Item1')}</li>
          <li>{t('delivery.s2Item2')}</li>
          <li>{t('delivery.s2Item3')}</li>
        </ul>
        <p><em>{t('delivery.s2Note')}</em></p>

        <h3>{t('delivery.s3Title')}</h3>
        <p>{t('delivery.s3Body')}</p>

        <h3>{t('delivery.s4Title')}</h3>
        <p>{t('delivery.s4Body')}</p>

        <h3>{t('delivery.s5Title')}</h3>
        <p>
          {t('delivery.s5BodyPre')} <Link to="/orders">{t('delivery.s5Link')}</Link> {t('delivery.s5BodyPost')}
        </p>

        <h3>{t('delivery.s6Title')}</h3>
        <p>
          {t('delivery.s6BodyPre')} <Link to="/contact">{t('terms.s10Link')}</Link> {t('delivery.s6BodyPost')}
        </p>
      </div>
    </div>
  );
}
