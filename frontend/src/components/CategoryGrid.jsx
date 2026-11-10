import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { categoryUrl, isDisabledCategory } from '../utils/taxonomy';

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// `name` is also the actual /category/<slug> filter value the backend
// expects (via categoryUrl(), see utils/taxonomy.js), so it stays the fixed
// English catalog term — `labelKey` is what gets translated for display, via
// the same nav.* keys already used in the navbar's category dropdown for
// these exact categories.
const CATEGORIES = [
  { name: 'Display', labelKey: 'nav.display', image: 'display-icon.webp' },
  { name: 'SIM Tray', labelKey: 'nav.simTray', image: 'sim-tray-icon.webp' },
  { name: 'Charging Logic', labelKey: 'nav.chargingPort', image: 'charging-port-icon.webp' },
  { name: 'Back Glass', labelKey: 'nav.backGlass', image: 'back-glass-icon.webp' },
  { name: 'Camera', labelKey: 'nav.camera', image: 'camera-icon.webp' },
  { name: 'Logic Board', labelKey: 'nav.logicBoard', image: 'default-icon.webp' },
  { name: 'Speaker', labelKey: 'nav.speaker', image: 'speaker-icon.webp' },
];

export default function CategoryGrid() {
  const { t } = useLanguage();
  // First row-and-a-half of real categories, then a "View All Categories"
  // tile as the 8th slot — matches the 4x2 category grid in the reference
  // design. The full list is still reachable from here and from /shop.
  const shown = CATEGORIES.filter((c) => !isDisabledCategory(c.name));
  return (
    <div className="category-grid">
      {shown.map((c) => (
        <Link key={c.name} to={categoryUrl(c.name)} className="category-tile">
          {/* Curated fixed cut-outs: predictable, clean and cacheable. */}
          <span className="category-tile-photo">
            <img
              src={`/images/parts/photos/${c.image}`}
              alt={`${c.name} mobile phone spare part`}
              width="160"
              height="160"
              loading="lazy"
              decoding="async"
            />
          </span>
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
