import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';

const LAST_UPDATED = 'August 2026'; // update manually when this text changes — see Terms.jsx for why

export default function RefundPolicy() {
  usePageMeta('Refund & Return Policy', 'Read Noyon Telecom\'s policy on refunds, returns, and exchanges.');
  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Legal</span>
        <h1 className="page-title">Refund &amp; <em>Return</em> Policy</h1>
      </div>
      <div className="legal-content">
        <p><em>Last updated: {LAST_UPDATED}</em></p>

        <h3>1. Return window</h3>
        <p>
          You may return most unused, uninstalled parts within <strong>7 days</strong> of delivery for a
          full refund or exchange, provided the item is in its original packaging with all seals intact.
          Displays and other components must be tested for functionality before installation — once a part
          has been installed, glued, or has had its protective film/seal removed, it can no longer be
          returned for warranty unless it was defective on arrival. Batteries carry no warranty if swollen
          or physically damaged after delivery.
        </p>

        <h3>2. How to start a return</h3>
        <ol>
          <li>Contact us via the <Link to="/contact">Contact page</Link> with your order number</li>
          <li>We'll confirm eligibility and provide return instructions</li>
          <li>Ship the item back in its original packaging</li>
          <li>Once received and inspected, your refund will be processed within 5–7 business days</li>
        </ol>

        <h3>3. Damaged or incorrect items</h3>
        <p>
          If you receive a damaged, defective, or incorrect item, please contact us within 48 hours of
          delivery with photos of the item. We will arrange a replacement or full refund at no additional
          cost to you.
        </p>

        <h3>4. Refund method</h3>
        <p>
          Refunds are issued to the original payment method. For Cash on Delivery orders, refunds are made
          via bank transfer or mobile financial service (bKash/Nagad) to the account you provide.
        </p>

        <h3>5. Non-returnable items</h3>
        <ul>
          <li>Installed, glued, or seal-broken parts (displays, batteries, back glass, flex cables) unless defective on arrival</li>
          <li>Items marked "final sale" at checkout</li>
          <li>Gift cards</li>
        </ul>

        <h3>6. Shipping costs</h3>
        <p>
          Return shipping costs are the customer's responsibility unless the return is due to our error
          (wrong item, damaged item, or defect).
        </p>

        <h3>7. Questions</h3>
        <p>
          Need help with a return? Reach out via our <Link to="/contact">Contact page</Link> and we'll be happy
          to assist.
        </p>

        <p className="legal-note">
          This is a template policy for a demo store. Adjust the return window, non-returnable items, and
          refund method to match your actual business practices and local consumer protection law before
          launching.
        </p>
      </div>
    </div>
  );
}
