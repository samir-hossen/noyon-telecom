import { Link } from 'react-router-dom';
import { brandUrl, MENU_BRANDS as BRANDS } from '../utils/taxonomy';

export default function BrandStrip() {
  return (
    <div className="brand-strip">
      {BRANDS.map((b) => (
        <Link key={b} to={brandUrl(b)} className="brand-chip">
          {b}
        </Link>
      ))}
    </div>
  );
}
