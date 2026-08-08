import { Link } from 'react-router-dom';

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola'];

export default function BrandStrip() {
  return (
    <div className="brand-strip">
      {BRANDS.map((b) => (
        <Link key={b} to={`/shop?brand=${encodeURIComponent(b)}`} className="brand-chip">
          {b}
        </Link>
      ))}
    </div>
  );
}
