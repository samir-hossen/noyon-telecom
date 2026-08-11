import { useLanguage } from '../context/LanguageContext';

const FEATURES = [
  {
    key: 'delivery',
    titleKey: 'home.trustDeliveryTitle',
    subKey: 'home.trustDeliverySub',
    color: '#e60023',
    bg: '#fde8ea',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 7h13v9H2z" strokeLinejoin="round" />
        <path d="M15 10h4l3 3v3h-7z" strokeLinejoin="round" />
        <circle cx="6.5" cy="18" r="1.7" />
        <circle cx="17.5" cy="18" r="1.7" />
      </svg>
    ),
  },
  {
    key: 'original',
    titleKey: 'home.trustOriginalTitle',
    subKey: 'home.trustOriginalSub',
    color: '#2563eb',
    bg: '#e6edfd',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'support',
    // Matches the actual stated hours (Navbar hotline, Footer, Contact page
    // all say 9 AM–8 PM / Sat–Thu) — this badge previously claimed "24/7
    // Support", which doesn't match reality and could reasonably annoy a
    // customer who tries the hotline outside those hours expecting it.
    titleKey: 'home.trustSupportTitle',
    subKey: 'home.trustSupportSub',
    color: '#7c3aed',
    bg: '#efe7fd',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
        <path d="M19.5 19.5A5 5 0 0 1 14 22" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'cod',
    titleKey: 'home.trustCodTitle',
    subKey: 'home.trustCodSub',
    color: '#16a34a',
    bg: '#e4f6ea',
    // A rect+circle "banknote" outline still read as a camera (body +
    // lens) at this icon's small render size — swapped for the Taka sign
    // itself, which can't be mistaken for anything else and matches the
    // currency shown everywhere else on the site.
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill="currentColor">৳</text>
      </svg>
    ),
  },
];

// Trust-signal strip shown right under the hero — new addition, purely
// presentational, no data/logic dependency. Titles/subtitles previously
// hardcoded in English regardless of the site's language toggle, so a
// Bangla-mode visitor saw this strip in English while everything below it
// (part finder, category headings) correctly switched to Bangla — routed
// through useLanguage()/translations.js like the rest of the page now.
export default function FeatureStrip() {
  const { t } = useLanguage();
  return (
    <div className="feature-strip">
      {FEATURES.map((f) => (
        <div className="feature-strip-item" key={f.key}>
          <span className="feature-strip-icon" style={{ background: f.bg, color: f.color }}>
            {f.icon}
          </span>
          <div>
            <strong>{t(f.titleKey)}</strong>
            <span>{t(f.subKey)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
