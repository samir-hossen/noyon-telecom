import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageTitle';
import AnnouncementBar from '../components/AnnouncementBar.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';
import ProductCard from '../components/ProductCard.jsx';
import PartFinder from '../components/PartFinder.jsx';
import CategoryGrid from '../components/CategoryGrid.jsx';
import BrandStrip from '../components/BrandStrip.jsx';
import FlashSale from '../components/FlashSale.jsx';
import FeatureStrip from '../components/FeatureStrip.jsx';
import HomeTrustBar from '../components/HomeTrustBar.jsx';
import Testimonials from '../components/Testimonials.jsx';
import FAQAccordion, { FAQS } from '../components/FAQAccordion.jsx';

export default function Home() {
  const [sections, setSections] = useState({ featured: [], newArrivals: [], bestSellers: [], latestImports: [], deals: [] });
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  usePageMeta(
    undefined,
    'Wholesale mobile phone spare parts in Bangladesh — displays, batteries, back glass, charging ports and more, for dealers, shops and service centers.',
    undefined,
    undefined,
    {
      id: 'faq',
      data: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: t(f.qKey),
          acceptedAnswer: { '@type': 'Answer', text: t(f.aKey) },
        })),
      },
    }
  );

  useEffect(() => {
    // Each rail is now computed server-side (indexed/limited queries) in one
    // request, instead of fetching up to 200 products and slicing them in
    // the browser — see backend/src/routes/products.routes.js:/home-sections.
    // A failed request previously left every rail silently empty with zero
    // feedback — the rest of the homepage (hero, categories, etc.) still
    // works fine without product data, so this only needs a toast, not a
    // full error page.
    api.get('/products/home-sections').then(setSections).catch((err) => showToast(err.message, 'error')).finally(() => setLoading(false));
  }, [showToast]);

  async function handleAdd(id) {
    try {
      await addToCart(id, 1);
      showToast('Added to cart', 'success');
    } catch (e) {
      if (e.message.toLowerCase().includes('authenticated')) {
        showToast('Please sign in to add items to your cart', 'error');
        navigate('/login');
      } else {
        showToast(e.message, 'error');
      }
    }
  }

  const { featured, newArrivals, bestSellers, latestImports, deals } = sections;

  return (
    <div>
      <AnnouncementBar />
      <div className="container">
        <HeroCarousel />
        <FeatureStrip />
      </div>

      <div className="container">
        <PartFinder />
      </div>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">{t('home.categories')}</h2>
          <Link to="/shop" className="section-link">{t('home.viewAll')} →</Link>
        </div>
        <CategoryGrid />
      </section>

      {!loading && deals.length > 0 && <FlashSale products={deals} onAdd={handleAdd} />}

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">{t('home.brands')}</h2>
        </div>
        <BrandStrip />
      </section>

      <div className="container" style={{ marginBottom: 64 }}>
        <HomeTrustBar />
      </div>

      <div className="container">
        <div className="promo-banner">
          <div>
            <strong>{t('nav.becomeDealer')}</strong>
            <p>{t('home.becomeDealerBanner')}</p>
          </div>
          <Link to="/register" className="btn btn-primary">{t('home.becomeDealerCta')}</Link>
        </div>
      </div>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">{t('home.featured')}</h2>
          <Link to="/shop" className="section-link">{t('home.viewAll')} →</Link>
        </div>
        <div className="grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div className="card skeleton-card" key={i}>
                  <div className="skeleton-block" style={{ aspectRatio: '1 / 1.05' }} />
                  <div className="card-body">
                    <div className="skeleton-line" style={{ width: '40%' }} />
                    <div className="skeleton-line" style={{ width: '80%', height: 18 }} />
                  </div>
                </div>
              ))
            : featured.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} />)}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">{t('home.newArrivals')}</h2>
          <Link to="/shop" className="section-link">{t('home.viewAll')} →</Link>
        </div>
        <div className="grid">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">{t('home.bestSelling')}</h2>
          <Link to="/shop?sort=rating" className="section-link">{t('home.viewAll')} →</Link>
        </div>
        <div className="grid">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      </section>

      {latestImports.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <h2 className="section-title">{t('home.latestImports')}</h2>
            <Link to="/shop?sort=newest" className="section-link">{t('home.viewAll')} →</Link>
          </div>
          <div className="grid">
            {latestImports.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        </section>
      )}

      <Testimonials />
      <FAQAccordion />
    </div>
  );
}
