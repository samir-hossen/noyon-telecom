import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';

// Fixed, not `new Date()` — a "Last updated" date must reflect when the
// text actually last changed. Update this string yourself whenever you
// revise the policy below; a date that silently becomes "today" on every
// page load is misleading (and a bad look if this is ever scrutinized).
const LAST_UPDATED = 'August 2026';

export default function Terms() {
  usePageMeta('Terms of Service', 'Read the terms and conditions for shopping at Noyon Telecom.');
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Legal</span>
        <h1 className="page-title">Terms of <em>Service</em></h1>
      </div>
      <div className="legal-content">
        <p><em>Last updated: {LAST_UPDATED}</em></p>

        <h3>1. Acceptance of terms</h3>
        <p>
          By accessing or using this website, you agree to be bound by these Terms of Service. If you do not
          agree with any part of these terms, please do not use our website.
        </p>

        <h3>2. Accounts</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account password and for all
          activity under your account. You must provide accurate and complete information when creating an
          account.
        </p>

        <h3>3. Orders and pricing</h3>
        <p>
          All prices are listed in BDT (৳) unless otherwise stated and are subject to change without notice. We
          reserve the right to refuse or cancel any order for reasons including but not limited to product
          availability, errors in pricing, or suspected fraudulent activity.
        </p>

        <h3>4. Payment</h3>
        <p>
          We accept the payment methods displayed at checkout. Orders placed with Cash on Delivery must be
          paid in full at the time of delivery. For prepaid methods, your order will be processed once
          payment is confirmed.
        </p>

        <h3>5. Shipping</h3>
        <p>
          Estimated delivery times are provided at checkout and are not guaranteed. We are not responsible
          for delays caused by courier services, weather, or circumstances beyond our control.
        </p>

        <h3>6. Returns and refunds</h3>
        <p>
          Please see our <Link to="/refund-policy">Refund &amp; Return Policy</Link> for details on returns,
          exchanges, and refunds.
        </p>

        <h3>7. Product reviews</h3>
        <p>
          By submitting a review, you grant us the right to display it on our website. Reviews must be
          honest, relevant, and free of offensive or misleading content. We reserve the right to remove any
          review that violates these guidelines.
        </p>

        <h3>8. Limitation of liability</h3>
        <p>
          We are not liable for any indirect, incidental, or consequential damages arising from the use of
          our products or website, to the maximum extent permitted by law.
        </p>

        <h3>9. Changes to these terms</h3>
        <p>
          We may update these Terms of Service from time to time. Continued use of the website after changes
          are posted constitutes acceptance of the revised terms.
        </p>

        <h3>10. Contact us</h3>
        <p>
          Questions about these terms? Visit our <Link to="/contact">Contact page</Link>.
        </p>

        <p className="legal-note">
          This is a template for a demo store. Have a legal professional review and adapt these terms before
          launching a real business.
        </p>
      </div>
    </div>
  );
}
