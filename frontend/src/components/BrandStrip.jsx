import { Link } from 'react-router-dom';
import { brandUrl } from '../utils/taxonomy';

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola'];

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
