import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { useLanguage } from '../context/LanguageContext';

// Text fields are translation keys (see i18n/translations.js hero.slideN.*),
// not literal strings — img/alt/to stay as-is since they're asset paths and
// routes, not user-facing copy. Previously every field here was a hardcoded
// English string with no useLanguage()/t() wiring at all, so switching the
// site to Bangla left the entire hero banner (and its "100% Original / Fast
// Delivery / Warranty Assured" badges) stuck in English while every other
// section of the homepage correctly switched — the same bug already fixed
// once in FeatureStrip.jsx, still present here.
const SLIDES = [
  {
    eyebrowKey: 'hero.slide1.eyebrow',
    titleTopKey: 'hero.slide1.titleTop',
    titleEmKey: 'hero.slide1.titleEm',
    titleRestKey: 'hero.slide1.titleRest',
    subKey: 'hero.slide1.sub',
    img: '/images/hero/hero-parts.svg',
    alt: 'Mobile phone display and spare parts on a workbench',
    stripeKey: 'hero.slide1.stripe',
    cta1: { labelKey: 'hero.slide1.cta1', to: '/shop' },
    cta2: { labelKey: 'hero.slide1.cta2', to: '/shop?category=Display' },
  },
  {
    eyebrowKey: 'hero.slide2.eyebrow',
    titleTopKey: 'hero.slide2.titleTop',
    titleEmKey: 'hero.slide2.titleEm',
    titleRestKey: 'hero.slide2.titleRest',
    subKey: 'hero.slide2.sub',
    img: '/images/hero/hero-batteries.svg',
    alt: 'Mobile phone batteries stacked for wholesale',
    stripeKey: 'hero.slide2.stripe',
    cta1: { labelKey: 'hero.slide2.cta1', to: '/register' },
    cta2: { labelKey: 'hero.slide2.cta2', to: '/shop?sort=rating' },
  },
  {
    eyebrowKey: 'hero.slide3.eyebrow',
    titleTopKey: 'hero.slide3.titleTop',
    titleEmKey: 'hero.slide3.titleEm',
    titleRestKey: 'hero.slide3.titleRest',
    subKey: 'hero.slide3.sub',
    img: '/images/hero/hero-camera.svg',
    alt: 'Mobile phone camera module component',
    stripeKey: 'hero.slide3.stripe',
    cta1: { labelKey: 'hero.slide3.cta1', to: '/shop' },
    cta2: { labelKey: 'hero.slide3.cta2', to: 'https://wa.me/8801560047377' },
  },
];

const AUTO_MS = 5000;

// These slides used to hotlink photos straight from Unsplash's CDN. That's
// an external network request on every single pageview with no fallback —
// on flaky mobile connections (or if Unsplash rate-limits/hiccups) the slide
// silently rendered as a bare alt-text string on a black box. Self-hosted
// SVGs under /public/images/hero ship in our own bundle, so the hero always
// renders instantly with zero third-party dependency. The onError handler
// below is a last-resort safety net in case an asset path is ever wrong.

export default function HeroCarousel() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  // Admin-uploaded banners (see Admin > Banners) override the hardcoded
  // SLIDES above when present. Starts as [] (not null) so the hero renders
  // immediately with the self-hosted SVG slides — this fetch never blocks
  // the hero's first paint/LCP; if banners load in afterwards, the
  // carousel swaps over to them.
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    let current = true;
    api.get('/banners').then((d) => {
      if (current && d.banners?.length) setBanners(d.banners);
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  const useAdminBanners = banners.length > 0;
  const slideCount = useAdminBanners ? banners.length : SLIDES.length;

  useEffect(() => {
    if (index >= slideCount) setIndex(0);
  }, [slideCount, index]);

  useEffect(() => {
    if (paused || slideCount <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slideCount);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [paused, slideCount]);

  function goTo(i) {
    setIndex((i + slideCount) % slideCount);
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    // Pause for the duration of the touch, same as hover on desktop. Doing
    // this here (not just via onMouseEnter below) matters because mobile
    // browsers fire a synthetic mouseenter on tap for compatibility but
    // often never fire the matching mouseleave — that left `paused` stuck
    // true forever after a single touch anywhere on the hero (e.g. just
    // scrolling past it), silently killing autoplay for the rest of the
    // session. Explicitly resuming on touchend below fixes that regardless
    // of whether the ghost mouse events fire.
    setPaused(true);
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) {
      setPaused(false);
      return;
    }
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(index + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
    setPaused(false);
  }
  function onTouchCancel() {
    // The browser fires touchcancel instead of touchend when a touch that
    // started on the hero turns into a page scroll gesture — a very common
    // way to touch this section without meaning to swipe it. Without this,
    // that path left `paused` stuck true just like the original
    // mouseenter/mouseleave bug did.
    touchStartX.current = null;
    setPaused(false);
  }

  return (
    <section
      className="hero hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchCancel={onTouchCancel}
      onTouchEnd={onTouchEnd}
    >
      {useAdminBanners ? (
        <div className="hero-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {banners.map((b, i) => {
            const img = (
              <img
                src={b.imageUrl}
                alt={b.altText || ''}
                width="1200"
                height="900"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={i === 0 ? 'high' : 'auto'}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
              />
            );
            return (
              <div className="hero-grid hero-grid-banner" key={b.id} aria-hidden={i !== index}>
                <div className="hero-img hero-img-banner">
                  {b.linkUrl ? (
                    /^https?:\/\//.test(b.linkUrl) ? (
                      <a href={b.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a>
                    ) : (
                      <Link to={b.linkUrl}>{img}</Link>
                    )
                  ) : img}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hero-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((s, i) => (
            <div className="hero-grid" key={i} aria-hidden={i !== index}>
              <div className="hero-copy">
                <span className="eyebrow">{t(s.eyebrowKey)}</span>
                <h1 className="hero-title">
                  {t(s.titleTopKey)}
                  <br />
                  <em>{t(s.titleEmKey)}</em> {t(s.titleRestKey)}
                </h1>
                <p className="hero-sub">{t(s.subKey)}</p>
                <div className="hero-badges">
                  <span className="hero-badge">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" strokeLinejoin="round" /></svg>
                    {t('hero.badge.original')}
                  </span>
                  <span className="hero-badge">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7h13v9H2z" strokeLinejoin="round" /><path d="M15 10h4l3 3v3h-7z" strokeLinejoin="round" /><circle cx="6.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
                    {t('hero.badge.delivery')}
                  </span>
                  <span className="hero-badge">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" strokeLinejoin="round" /></svg>
                    {t('hero.badge.warranty')}
                  </span>
                </div>
                <div className="hero-actions">
                  <Link to={s.cta1.to} className="btn btn-berry">{t(s.cta1.labelKey)}</Link>
                  <Link to={s.cta2.to} className="btn btn-outline" style={{ borderColor: 'var(--paper)', color: 'var(--paper)' }}>
                    {t(s.cta2.labelKey)}
                  </Link>
                </div>
              </div>
              <div className="hero-img">
                <img
                  src={s.img}
                  alt={s.alt}
                  width="1200"
                  height="900"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                />
                <div className="hero-stripe">{t(s.stripeKey)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="hero-arrow hero-arrow-left" aria-label="Previous slide" onClick={() => goTo(index - 1)}>‹</button>
      <button className="hero-arrow hero-arrow-right" aria-label="Next slide" onClick={() => goTo(index + 1)}>›</button>

      <div className="hero-dots">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === index ? 'active' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
