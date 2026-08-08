import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

// Small inline icons for the trust bar — plain geometric shapes rather than
// any brand's logo, since these badges describe facts about this business
// (license, security), not endorsements from a third party.
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v5.5c0 4.6-3 8.3-7 9.5-4-1.2-7-4.9-7-9.5V6l7-3Z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h5M9.5 15.5h5" strokeLinecap="round" />
    </svg>
  );
}

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

  async function onSubscribe(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/newsletter', { email });
      showToast("You're on the list!", 'success');
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
          <h3 className="store-address-heading">Shop &amp; Instant Service Address</h3>
          <p className="store-address-text">
            ৪/১৮১ (৫ম তলা), গুলিস্তান শপিং কমপ্লেক্স, ২ বি.বি এভিনিউ, গুলিস্তান, ঢাকা-১০০০
          </p>
          <p className="store-address-phone">
            <a href="tel:+8801560047377">☎ Call: 01560-047377</a>
          </p>

          <div className="store-address-links">
            <Link to="/about">About Us</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/refund-policy">Warranty Policy</Link>
            <Link to="/terms">Order &amp; Delivery Policy</Link>
            <Link to="/refund-policy">Return &amp; Refund Policy</Link>
            <Link to="/contact">Contact Us</Link>
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
            <p style={{ maxWidth: 260 }}>Bangladesh's wholesale importer & distributor of mobile phone spare parts — for dealers, shops and service centers. We don't sell retail.</p>
            <p style={{ marginTop: 12 }}>
              <a href="tel:+8801560047377">📞 Hotline: 01560-047377</a>
            </p>
            <p>
              <a href="https://wa.me/8801560047377" target="_blank" rel="noreferrer">💬 WhatsApp Us to Order</a>
            </p>
          </div>
          <div>
            <h4>Shop by Category</h4>
            <p><Link to="/shop?category=Display">Display</Link></p>
            <p><Link to="/shop?category=Battery">Battery</Link></p>
            <p><Link to="/shop?category=Charging Port">Charging Port</Link></p>
            <p><Link to="/shop?category=Back Glass">Back Glass</Link></p>
            <p><Link to="/shop">All parts →</Link></p>
          </div>
          <div>
            <h4>Support</h4>
            <p><Link to="/orders">Track an order</Link></p>
            <p><Link to="/about">About us</Link></p>
            <p><Link to="/request-quote">Request a bulk quote</Link></p>
            <p><Link to="/refund-policy">Warranty & returns</Link></p>
            <p><Link to="/contact">Contact us</Link></p>
            <p><Link to="/register">Become a dealer</Link></p>
          </div>
          <div>
            <h4>Stay in the loop</h4>
            <p>New stock arrivals and dealer offers, straight to your inbox.</p>
            <form onSubmit={onSubscribe} className="newsletter-form">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-berry" disabled={busy} style={{ padding: '10px 18px' }}>
                {busy ? '…' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        {/* [[ EDIT: replace the placeholder numbers below with your real Trade
            License and BIN once issued/renewed — a wrong or fake number here
            is worse than showing nothing, since a dealer who checks and finds
            it doesn't match stops trusting the rest of the site too. ]] */}
        <div className="trust-bar">
          <div className="trust-badge">
            <ShieldIcon />
            <div>
              <strong>Trade License</strong>
              <span>No. [[ EDIT: TRAD/XXX/XXXXX/2024 ]]</span>
            </div>
          </div>
          <div className="trust-badge">
            <DocIcon />
            <div>
              <strong>Business ID (BIN)</strong>
              <span>[[ EDIT: 000000000-0000 ]]</span>
            </div>
          </div>
          <div className="trust-badge">
            <LockIcon />
            <div>
              <strong>Secure Checkout</strong>
              <span>SSL-encrypted · SSLCommerz</span>
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
              <strong>Reviewed on Trustpilot</strong>
              <span>See customer reviews →</span>
            </div>
          </a>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Noyon Telecom — All Rights Reserved</span>
          <span className="footer-legal-links">
            <Link to="/privacy-policy">Privacy</Link> · <Link to="/terms">Terms</Link> · <Link to="/refund-policy">Refunds</Link> · <Link to="/admin/login">Admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
