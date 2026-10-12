import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';
import { PHOTO_CREDITS } from '../content/photoCredits';

// The free licences of the representative part photos ask for this credit
// (author, licence, link, what we changed). Linked from the footer and from
// every product page that shows one of these photos.
export default function PhotoCredits() {
  const { t } = useLanguage();
  usePageMeta(t('credits.pageTitle'), t('credits.pageMeta'), null, '/photo-credits', null, true);
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('credits.title')}</h1>
      </div>
      <div className="legal-content">
        <p>{t('credits.intro')}</p>
        <p>{t('credits.source')}</p>
        <ul className="credit-list">
          {PHOTO_CREDITS.map((c) => (
            <li key={c.file}>
              <img src={`/images/parts/photos/${c.file}-sm.webp`} alt="" width="88" height="88" loading="lazy" decoding="async" />
              <div>
                <strong>{c.part}</strong>
                <span>
                  “<a href={c.source} target="_blank" rel="noopener noreferrer">{c.title}</a>” by {c.author},{' '}
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license">{c.license}</a>. {c.changes}.
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
