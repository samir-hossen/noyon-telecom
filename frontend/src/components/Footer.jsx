import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import CityscapeStrip from './CityscapeStrip.jsx';

// Small inline icons for the trust bar — plain geometric shapes rather than
// any brand's logo, since these badges describe facts about this business
// (license, security), not endorsements from a third party.
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.5 1.3 6.6L12 17l-5.9 3.4 1.3-6.6-4.9-4.5 6.6-.7L12 2.5Z" />
    </svg>
  );
}

export default function Footer() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  async function onSubscribe(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/newsletter', { email });
      showToast(t('footer.subscribedSuccess'), 'success');
      setEmail('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="footer">
      <div className="store-address-panel">
        <div className="container store-address-inner">
          <span className="store-address-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" strokeLinejoin="round" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </span>
          <h3 className="store-address-heading">{t('footer.instantServiceAddress')}</h3>
          <p className="store-address-text">
            ৪/১৮১ (৫ম তলা), গুলিস্তান শপিং কমপ্লেক্স, ২ বি.বি এভিনিউ, গুলিস্তান, ঢাকা-১০০০
          </p>
          <p className="store-address-phone">
            <a href="tel:+8801560047377">☎ {t('footer.call')} 01560-047377</a>
          </p>

          <div className="store-address-links">
            <Link to="/about">{t('footer.aboutUs')}</Link>
            <Link to="/privacy-policy">{t('footer.privacyPolicy')}</Link>
            <Link to="/refund-policy">{t('footer.warrantyPolicy')}</Link>
            <Link to="/terms">{t('footer.orderDeliveryPolicy')}</Link>
            <Link to="/refund-policy">{t('footer.returnRefundPolicy')}</Link>
            <Link to="/contact">{t('footer.contactUs')}</Link>
          </div>
        </div>
      </div>

      <div className="container footer-main-container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <img src="/logo-mark.png" alt="" className="footer-logo-mark" />
              Noyon Telecom
            </div>
            <p style={{ maxWidth: 260 }}>{t('footer.tagline')}</p>
            <p style={{ marginTop: 12 }}>
              <a href="tel:+8801560047377">📞 {t('footer.hotline')} 01560-047377</a>
            </p>
            <p>
              <a href="https://wa.me/8801560047377" target="_blank" rel="noreferrer">💬 {t('footer.whatsappUsToOrder')}</a>
            </p>
          </div>
          <div>
            <h4>{t('footer.shopByCategory')}</h4>
            <p><Link to="/shop?category=Display">{t('nav.display')}</Link></p>
            <p><Link to="/shop?category=Battery">{t('nav.battery')}</Link></p>
            <p><Link to="/shop?category=Charging Port">{t('nav.chargingPort')}</Link></p>
            <p><Link to="/shop?category=Back Glass">{t('nav.backGlass')}</Link></p>
            <p><Link to="/shop">{t('footer.allPartsArrow')}</Link></p>
          </div>
          <div>
            <h4>{t('footer.support')}</h4>
            <p><Link to="/orders">{t('footer.trackOrder')}</Link></p>
            <p><Link to="/about">{t('footer.aboutUs')}</Link></p>
            <p><Link to="/request-quote">{t('footer.requestBulkQuote')}</Link></p>
            <p><Link to="/refund-policy">{t('footer.warrantyReturns')}</Link></p>
            <p><Link to="/contact">{t('footer.contactUsLower')}</Link></p>
            <p><Link to="/register">{t('nav.becomeDealer')}</Link></p>
          </div>
          <div>
            <h4>{t('home.newsletter')}</h4>
            <p>{t('home.newsletterSub')}</p>
            <form onSubmit={onSubscribe} className="newsletter-form">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-berry" disabled={busy} style={{ padding: '10px 18px' }}>
                {busy ? '…' : t('footer.join')}
              </button>
            </form>
          </div>
        </div>

        <div className="trust-bar">
          <div className="trust-badge">
            <LockIcon />
            <div>
              <strong>{t('footer.secureCheckout')}</strong>
              <span>{t('footer.sslEncrypted')}</span>
            </div>
          </div>
          {/* [[ EDIT: Trustpilot link only works once you've claimed a
              trustpilot.com/evaluate business profile — until then this
              points nowhere useful, so either set it up or remove this
              badge; a "Trustpilot" badge that 404s does more harm than
              having no badge at all. ]] */}
          <a
            className="trust-badge trust-badge-link"
            href="https://www.trustpilot.com/evaluate/noyontelecom.com"
            target="_blank"
            rel="noreferrer"
          >
            <StarIcon />
            <div>
              <strong>{t('footer.reviewedOnTrustpilot')}</strong>
              <span>{t('footer.seeCustomerReviews')}</span>
            </div>
          </a>
        </div>

        <CityscapeStrip />

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Noyon Telecom — {t('common.footer.rights')}</span>
          <span className="footer-legal-links">
            <Link to="/privacy-policy">{t('footer.privacy')}</Link> · <Link to="/terms">{t('footer.terms')}</Link> · <Link to="/refund-policy">{t('footer.refunds')}</Link> · <Link to="/admin/login">{t('nav.admin')}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
