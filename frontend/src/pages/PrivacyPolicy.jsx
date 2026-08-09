import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';

const LAST_UPDATED = 'August 2026'; // update manually when this text changes — see Terms.jsx for why

export default function PrivacyPolicy() {
  usePageMeta('Privacy Policy', 'Learn how Noyon Telecom collects, uses, and protects your personal data.');
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Legal</span>
        <h1 className="page-title">Privacy <em>Policy</em></h1>
      </div>
      <div className="legal-content">
        <p><em>Last updated: {LAST_UPDATED}</em></p>

        <h3>1. Information we collect</h3>
        <p>
          When you create an account, place an order, sign up for our newsletter, or contact us, we collect
          information such as your name, email address, phone number, shipping address, and order history.
          Payments are processed directly by SSLCommerz, a licensed Bangladeshi payment gateway — your card
          or mobile banking details are entered on their secure checkout page and are never seen or stored
          on our servers.
        </p>

        <h3>2. How we use your information</h3>
        <ul>
          <li>To process and deliver your orders</li>
          <li>To send order confirmations and shipping updates</li>
          <li>To respond to your questions and support requests</li>
          <li>To send occasional newsletters, only if you opted in</li>
          <li>To improve our products and website experience</li>
        </ul>

        <h3>3. How we protect your information</h3>
        <p>
          Passwords are stored using industry-standard one-way hashing (bcrypt) and are never stored or
          visible in plain text. Access to your account is protected using secure tokens, and our systems
          include rate limiting and brute-force protection against unauthorized login attempts.
        </p>

        <h3>4. Sharing your information</h3>
        <p>
          We do not sell or rent your personal information to third parties. Information may be shared with
          trusted service providers strictly to fulfill orders (e.g. courier services for delivery, payment
          processors for billing).
        </p>

        <h3>5. Your rights</h3>
        <p>
          You may request access to, correction of, or deletion of your personal data at any time by
          contacting us. You can unsubscribe from marketing emails at any time using the link in the email
          or by contacting support.
        </p>

        <h3>6. Cookies</h3>
        <p>
          We use minimal, essential cookies/local storage to keep you signed in and remember your cart.
          We do not use third-party advertising trackers beyond what is disclosed in this policy.
        </p>

        <h3>7. Contact us</h3>
        <p>
          If you have questions about this policy or how your data is handled, please reach out via our{' '}
          <Link to="/contact">Contact page</Link>.
        </p>

        <p className="legal-note">
          This is a template policy for a demo store. Before going live, have this reviewed by a legal
          professional to ensure compliance with the laws applicable in your country (e.g. Bangladesh's Digital
          Security Act / Consumer Rights Protection Act, or GDPR if serving EU customers).
        </p>
      </div>
    </div>
  );
}
