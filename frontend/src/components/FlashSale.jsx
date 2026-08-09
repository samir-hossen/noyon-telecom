import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveImg } from '../api';
import { formatPrice } from '../utils/currency';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMG } from '../utils/fallbackImage';

function getMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function FlashSale({ products, onAdd }) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = useState(getMidnight() - Date.now());
  const { ids, toggle } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => (r <= 1000 ? getMidnight() - Date.now() : r - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!products.length) return null;

  async function handleWishlist(e, product) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save items', 'error');
      navigate('/login');
      return;
    }
    const nowSaved = await toggle(product.id, product);
    showToast(nowSaved ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
  }

  const hrs = Math.max(0, Math.floor(remaining / 3600000));
  const mins = Math.max(0, Math.floor((remaining % 3600000) / 60000));
  const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));

  return (
    <section className="section container">
      <div className="flash-sale">
        <div className="flash-sale-head">
          <div>
            <h2 className="section-title">⚡ {t('home.flashSale')}</h2>
            <p className="flash-sale-sub">{t('home.flashSaleSub')}</p>
          </div>
          <div className="flash-sale-timer" aria-label={`Sale ends in ${pad(hrs)} hours ${pad(mins)} minutes ${pad(secs)} seconds`}>
            <div className="flash-sale-timer-col" aria-hidden="true">
              <div className="flash-sale-timer-box"><strong>{pad(hrs)}</strong></div>
              <span>Hrs</span>
            </div>
            <span className="flash-sale-timer-sep">:</span>
            <div className="flash-sale-timer-col" aria-hidden="true">
              <div className="flash-sale-timer-box"><strong>{pad(mins)}</strong></div>
              <span>Mins</span>
            </div>
            <span className="flash-sale-timer-sep">:</span>
            <div className="flash-sale-timer-col" aria-hidden="true">
              <div className="flash-sale-timer-box"><strong>{pad(secs)}</strong></div>
              <span>Secs</span>
            </div>
          </div>
        </div>
        <div className="deals-row">
          {products.map((p) => {
            const pct = Math.round(((p.compareAt - p.price) / p.compareAt) * 100);
            return (
              <div className="deal-card" key={p.id}>
                <Link to={`/product/${p.id}`} className="deal-img">
                  <span className="deal-badge">-{pct}%</span>
                  <img
                    src={resolveImg(p.img)}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </Link>
                <button
                  type="button"
                  className={`deal-heart ${ids?.has(p.id) ? 'active' : ''}`}
                  onClick={(e) => handleWishlist(e, p)}
                  aria-label={ids?.has(p.id) ? `Remove ${p.name} from wishlist` : `Save ${p.name} for later`}
                >
                  {ids?.has(p.id) ? '♥' : '♡'}
                </button>
                <div className="deal-body">
                  <Link to={`/product/${p.id}`}><span className="card-name" style={{ fontSize: '0.94rem' }}>{p.name}</span></Link>
                  <div className="card-price" style={{ marginTop: 6 }}>
                    <span className="now">{formatPrice(p.price)}</span>
                    <span className="was">{formatPrice(p.compareAt)}</span>
                  </div>
                  <div className="deal-cta-row">
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>MOQ {p.moq || 1}</span>
                    <button type="button" className="deal-cta" onClick={() => onAdd(p.id)} aria-label={`Add ${p.name} to cart`}>
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M6 8h12l1 12H5L6 8Z" strokeLinejoin="round" />
                        <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
