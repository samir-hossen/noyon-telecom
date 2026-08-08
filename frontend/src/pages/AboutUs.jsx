import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';

// Everything in double-bracket comments below ([[ EDIT: ... ]]) is a
// placeholder — swap it for your real numbers/story before going live.
// Specific, honest details (a real year founded, a real warehouse address,
// a real trade license number) are what make an About page actually build
// trust with a dealer deciding whether to wire you money; generic
// boilerplate does the opposite; a wholesale buyer who catches even one
// fabricated claim (a made-up "10,000+ orders" figure, a stock photo
// presented as your warehouse) stops trusting everything else on the page.
export default function AboutUs() {
  usePageMeta(
    'About Us',
    "Noyon Telecom is Bangladesh's wholesale importer & distributor of mobile phone spare parts for dealers, repair shops, and service centers."
  );

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Who we are</span>
        <h1 className="page-title">
          About <em>Noyon Telecom</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 620 }}>
          Bangladesh's wholesale importer &amp; distributor of mobile phone spare parts — built for dealers, repair
          shops, and service centers. We don't sell retail; our entire catalog, pricing, and support model exists
          to make your repair business run smoother.
        </p>
      </div>

      <div className="form-panel wide" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Our story</h3>
        <p style={{ lineHeight: 1.7, color: '#4a413c' }}>
          {/* [[ EDIT: replace with your real founding story — when you started,
              why, what problem you saw in the market. This is the single most
              important paragraph on this page for a dealer deciding whether to
              trust you with a large order. ]] */}
          Noyon Telecom started with a simple frustration familiar to every repair shop in Bangladesh: sourcing
          reliable, consistently-graded mobile parts shouldn't mean gambling on a new supplier every few months.
          We built a wholesale operation around solving exactly that — direct import relationships, parts that are
          checked before they ship, and pricing that stays honest whether you're ordering one display or five
          hundred.
        </p>
      </div>

      <div className="cards-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>🔧 What we do</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            We import and distribute displays, batteries, back glass, charging ports, and other mobile parts at
            wholesale volume — supplying dealers, repair shops, and service centers across Bangladesh.
          </p>
        </div>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>✅ Quality checks</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            {/* [[ EDIT: describe your actual QC process — inspected before
                shipping, graded by quality tier, tested on real devices, etc. ]] */}
            Every part is inspected before it leaves our warehouse, so what arrives at your shop matches what was
            promised on the listing — not a surprise you discover mid-repair.
          </p>
        </div>
        <div className="form-panel">
          <h3 style={{ marginBottom: 8 }}>🤝 Who we serve</h3>
          <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>
            Independent repair shops, mobile service centers, and dealers reselling parts — with dealer accounts,
            tiered/bulk pricing, and bulk quote requests built for how repair businesses actually order.
          </p>
        </div>
      </div>

      <div className="form-panel wide" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 16 }}>Why shops choose us</h3>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, listStyle: 'none', padding: 0, margin: 0 }}>
          <li>📦 &nbsp;Wide catalog across major brands — Apple, Samsung, OnePlus, Vivo, Oppo, Xiaomi, Realme, and more</li>
          <li>💳 &nbsp;Dealer pricing, bulk-quantity discounts, and formal quotations for large orders</li>
          <li>🚚 &nbsp;Nationwide delivery across Bangladesh, with Cash on Delivery or online payment (bKash, Nagad, Rocket, cards)</li>
          <li>💬 &nbsp;Direct WhatsApp support for urgent sourcing — no waiting on a ticket queue</li>
          <li>🛡️ &nbsp;Warranty terms on eligible parts, clearly stated on every product page</li>
          <li>
            {/* [[ EDIT: add a trade license / BIN number here once you have
                one to display — this single line does more for wholesale
                buyer trust than almost anything else on the page. ]] */}
            🏢 &nbsp;Trade License No. [[ your trade license number ]]
          </li>
        </ul>
      </div>

      <div className="form-panel wide" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: 10 }}>Ready to source your next order?</h3>
        <p style={{ color: '#6b5f59', marginBottom: 20 }}>
          Browse the catalog, or send us your parts list for a formal wholesale quote.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn btn-berry">
            Browse the catalog
          </Link>
          <Link to="/request-quote" className="btn btn-outline">
            Request a bulk quote
          </Link>
          <Link to="/contact" className="btn btn-outline">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
