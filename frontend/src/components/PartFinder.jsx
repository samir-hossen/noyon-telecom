import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola'];

// Representative model list per brand — the Shop page's search already
// matches against the full compatibleModels field on every product, so this
// list doesn't need to be exhaustive to be useful as a quick-find shortcut.
const MODELS_BY_BRAND = {
  Apple: ['iPhone 15 Pro Max', 'iPhone 14 Pro Max', 'iPhone 13', 'iPhone 12', 'iPhone 11'],
  Samsung: ['Galaxy S23 Ultra', 'Galaxy A54 5G', 'Galaxy A14', 'Galaxy A34 5G', 'Galaxy Note 20'],
  OnePlus: ['Nord CE3', 'OnePlus 11', 'Nord 3', 'OnePlus 9'],
  Vivo: ['V29', 'Y17s', 'V27', 'Y36'],
  Oppo: ['Reno 10', 'A78', 'F23', 'A18'],
  Xiaomi: ['Redmi Note 12', 'Redmi 12C', 'Poco X5', 'Mi 11'],
  Realme: ['Realme 11 Pro', 'Realme C55', 'Realme 10'],
  'Google Pixel': ['Pixel 8', 'Pixel 7a', 'Pixel 6'],
  Motorola: ['Moto G84', 'Moto Edge 40', 'Moto G54'],
};

const CATEGORIES = ['Display', 'Battery', 'Back Glass', 'Charging Port', 'Camera', 'Housing', 'Speaker', 'Frame'];

export default function PartFinder() {
  const { t } = useLanguage();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  function onFind(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    // Brand goes in its own filter param (exact match against the brand
    // column — see buildProductWhere in productQuery.js), and model goes in
    // free-text search. These used to be joined into one combined search
    // string ("Apple iPhone 13"), but the backend's search does a literal
    // substring match — a product named "iPhone 13 Display" doesn't contain
    // "Apple iPhone 13" anywhere in it, so a brand+model search almost never
    // matched anything. Keeping them separate lets each do what it's
    // actually good at.
    if (brand) params.set('brand', brand);
    if (model) params.set('search', model);
    navigate(`/shop?${params.toString()}`);
  }

  return (
    <div className="part-finder">
      <h3 className="part-finder-title">🔧 {t('partFinder.title')}</h3>
      <form className="part-finder-form" onSubmit={onFind}>
        <select
          value={brand}
          aria-label={t('partFinder.brand')}
          onChange={(e) => {
            setBrand(e.target.value);
            setModel('');
          }}
        >
          <option value="">{t('partFinder.brand')}</option>
          {BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={model} aria-label={t('partFinder.model')} onChange={(e) => setModel(e.target.value)} disabled={!brand}>
          <option value="">{t('partFinder.model')}</option>
          {(MODELS_BY_BRAND[brand] || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select value={category} aria-label={t('partFinder.category')} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('partFinder.category')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button type="submit" className="btn btn-primary">{t('partFinder.search')}</button>
      </form>
    </div>
  );
}
