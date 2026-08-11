import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// `name` is also the actual /shop?category= filter value the backend
// expects, so it stays the fixed English catalog term — `labelKey` is what
// gets translated for display, via the same nav.* keys already used in
// the navbar's category dropdown for these exact categories.
const CATEGORIES = [
  {
    name: 'Display', labelKey: 'nav.display', bg: '#fde8ea', color: '#c4001f',
    icon: <Icon><rect x="6" y="2.5" width="12" height="19" rx="2.2" /><path d="M10 19.2h4" /></Icon>,
  },
  {
    name: 'Battery', labelKey: 'nav.battery', bg: '#e4f6ea', color: '#16a34a',
    icon: <Icon><rect x="2.5" y="8" width="16.5" height="9" rx="1.8" /><path d="M19 11v3" /><path d="M6 11v3M9.5 11v3" /></Icon>,
  },
  {
    name: 'Charging Port', labelKey: 'nav.chargingPort', bg: '#e6edfd', color: '#2563eb',
    icon: <Icon><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M8 9V6.5M12 9V6.5M16 9V6.5" /></Icon>,
  },
  {
    name: 'Back Glass', labelKey: 'nav.backGlass', bg: '#f3e8fd', color: '#7c3aed',
    icon: <Icon><rect x="5" y="3" width="14" height="18" rx="2.4" /><path d="M9 3v18" strokeDasharray="1.5 3" /></Icon>,
  },
  {
    name: 'Camera', labelKey: 'nav.camera', bg: '#eef0f3', color: '#14161a',
    icon: <Icon><rect x="2.5" y="7" width="19" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.6" /><path d="M8 7l1.4-2.5h5.2L16 7" /></Icon>,
  },
  {
    name: 'Housing', labelKey: 'nav.housing', bg: '#fff3e0', color: '#c2740c',
    icon: <Icon><path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z" /><path d="M3 7l9 4.5 9-4.5M12 11.5V21" /></Icon>,
  },
  {
    name: 'Speaker', labelKey: 'nav.speaker', bg: '#fde8ea', color: '#c4001f',
    icon: <Icon><circle cx="12" cy="12" r="9.2" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></Icon>,
  },
];

export default function CategoryGrid() {
  const { t } = useLanguage();
  // First row-and-a-half of real categories, then a "View All Categories"
  // tile as the 8th slot — matches the 4x2 category grid in the reference
  // design. The full list is still reachable from here and from /shop.
  const shown = CATEGORIES;
  return (
    <div className="category-grid">
      {shown.map((c) => (
        <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className="category-tile">
          <span className="category-tile-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</span>
          <span className="category-tile-name">{t(c.labelKey)}</span>
        </Link>
      ))}
      <Link to="/shop" className="category-tile category-tile-viewall">
        <span className="category-tile-icon" style={{ background: 'var(--berry-tint)', color: 'var(--berry)' }}>
          <Icon><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></Icon>
        </span>
        <span className="category-tile-name">{t('nav.viewAllCategories')}</span>
      </Link>
    </div>
  );
}
