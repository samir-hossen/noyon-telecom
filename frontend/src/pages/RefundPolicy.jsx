import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

const LAST_UPDATED = 'August 2026'; // update manually when this text changes — see Terms.jsx for why

export default function RefundPolicy() {
  const { t } = useLanguage();
  usePageMeta(t('refund.pageTitle'), t('refund.pageMeta'));
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('terms.legal')}</span>
        <h1 className="page-title">{t('refund.titleTop')} <em>{t('refund.titleEm')}</em> {t('refund.titlePost')}</h1>
      </div>
      <div className="legal-content">
        <p><em>{t('terms.lastUpdated', null, { date: LAST_UPDATED })}</em></p>

        <h3>{t('refund.s1Title')}</h3>
        <p>
          {t('refund.s1Body', null, { days: t('refund.s1Days') })}
        </p>

        <h3>{t('refund.s2Title')}</h3>
        <ol>
          <li>{t('refund.s2Step1Pre')} <Link to="/contact">{t('terms.s10Link')}</Link> {t('refund.s2Step1Post')}</li>
          <li>{t('refund.s2Step2')}</li>
          <li>{t('refund.s2Step3')}</li>
          <li>{t('refund.s2Step4')}</li>
        </ol>

        <h3>{t('refund.s3Title')}</h3>
        <p>{t('refund.s3Body')}</p>

        <h3>{t('refund.s4Title')}</h3>
        <p>{t('refund.s4Body')}</p>

        <h3>{t('refund.s5Title')}</h3>
        <ul>
          <li>{t('refund.s5Item1')}</li>
          <li>{t('refund.s5Item2')}</li>
          <li>{t('refund.s5Item3')}</li>
        </ul>

        <h3>{t('refund.s6Title')}</h3>
        <p>{t('refund.s6Body')}</p>

        <h3>{t('refund.s7Title')}</h3>
        <p>
          {t('refund.s7BodyPre')} <Link to="/contact">{t('terms.s10Link')}</Link> {t('refund.s7BodyPost')}
        </p>

        <p className="legal-note">
          {t('refund.legalNote')}
        </p>
      </div>
    </div>
  );
}
