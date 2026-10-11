import { Link } from 'react-router-dom';
import { brandUrl, MENU_BRANDS as BRANDS } from '../utils/taxonomy';

// `limit`: the home page shows the main brands only (two clean rows); the
// shop filters and the menu list all of them.
export default function BrandStrip({ limit }) {
  return (
    <div className="brand-strip">
      {(limit ? BRANDS.slice(0, limit) : BRANDS).map((b) => (
        <Link key={b} to={brandUrl(b)} className="brand-chip">
          {b}
        </Link>
      ))}
    </div>
  );
}
