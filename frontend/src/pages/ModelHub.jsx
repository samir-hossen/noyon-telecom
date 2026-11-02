import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import NotFound from './NotFound.jsx';

// /model/<slug> — every part we list for one phone (e.g. /model/vivo-y21),
// linked from product pages ("other parts for this model") and brand pages.
// Page text comes from GET /api/seo/page, the same source as the
// server-rendered version of this page.
export default function ModelHub() {
  const { modelSlug } = useParams();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let current = true;
    setData(null);
    setPage(null);
    setMissing(false);
    setLoadError('');
    api.get(`/products/model/${encodeURIComponent(modelSlug)}`)
      .then((d) => { if (current) setData(d); })
      .catch((err) => {
        if (!current) return;
        // Only a real 404 means this model does not exist. A sleeping API,
        // network failure or 5xx must never turn a valid hub into noindex.
        if (err.status === 404) setMissing(true);
        else setLoadError(err.message || 'Unable to load parts. Please try again.');
      });
    api.get(`/seo/page?path=${encodeURIComponent(`/model/${modelSlug}`)}`)
      .then((d) => { if (current && d.status === 200) setPage(d); })
      .catch(() => {});
    return () => { current = false; };
  }, [modelSlug, retry]);

  usePageMeta(
    page?.head.title || (data ? `${data.model.name} Parts Wholesale Price in Bangladesh` : undefined),
    page?.head.description,
    undefined,
    `/model/${modelSlug}`,
    page?.jsonLd || [],
    missing,
    { exactTitle: Boolean(page), preserveExisting: !page && !missing }
  );

  async function handleAdd(id) {
    try {
      await addToCart(id, 1);
      showToast(t('shop.addedToCart'), 'success');
    } catch (e) {
      if (e.message.toLowerCase().includes('authenticated')) {
        showToast(t('shop.signInToAddCart'), 'error');
        navigate('/login');
      } else {
        showToast(e.message, 'error');
      }
    }
  }

  if (missing) return <NotFound />;

  if (loadError) return (
    <div className="container">
      <div className="empty-state" role="alert">
        <p>{loadError}</p>
        <button className="btn btn-primary" onClick={() => setRetry((n) => n + 1)}>Try again / আবার চেষ্টা করুন</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      {page?.breadcrumb && (
        <nav className="breadcrumb-trail" aria-label="Breadcrumb">
          {page.breadcrumb.map((c, i) =>
            i === page.breadcrumb.length - 1 ? (
              <span key={c.path} aria-current="page">{c.name}</span>
            ) : (
              <span key={c.path}><Link to={c.path}>{c.name}</Link> <span>/</span>{' '}</span>
            )
          )}
        </nav>
      )}
      <div className="page-header">
        <h1 className="page-title">{page?.h1 || data?.model.name || '…'}</h1>
      </div>

      {!data ? (
        <p style={{ padding: '40px 0', color: 'var(--muted)' }}>{t('shop.searching')}</p>
      ) : (
        <div className="grid grid-wide" style={{ paddingBottom: 40 }}>
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      )}

      {page?.intro && (
        <section className="shop-seo-text">
          <p>{page.intro}</p>
        </section>
      )}

      {page?.faq?.length > 0 && (
        <div className="form-panel wide" style={{ marginTop: 28, marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 14 }}>{t('shop.faqTitle')}</h2>
          {page.faq.map((f) => (
            <details key={f.q} style={{ marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
              <p style={{ color: '#6b5f59', marginTop: 6, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
