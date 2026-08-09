import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';

// A dedicated print stylesheet turns this into a clean PDF via the browser's
// native "Print → Save as PDF" — no extra PDF-generation dependency needed,
// and it works identically whether the order was placed as a guest or a
// logged-in dealer.
export default function Invoice() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  usePageMeta('Invoice', 'Printable invoice for your Noyon Telecom order.');

  useEffect(() => {
    // Guest orders require the email they checked out with as proof of
    // access (see orders.routes.js) — the "Print Invoice" link from the
    // order-confirmation page already carries it over, so this is only
    // ever missing if someone reached this URL some other way.
    const email = searchParams.get('email');
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    api.get(`/orders/${id}${qs}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [id, searchParams]);

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 28px' }}>
        <div className="empty-state">
          <div className="icon">🧾</div>
          <h3>Can't load this invoice</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="container" style={{ padding: '60px 28px' }}>Loading invoice…</div>;
  }

  const ship = order.shipping || {};
  const invoiceNo = `NT-INV-${order.id.slice(-8).toUpperCase()}`;

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <Link to={`/order-confirmation/${order.id}`} className="btn btn-outline">← Back</Link>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
      </div>

      <div className="invoice-sheet">
        <div className="invoice-head">
          <div>
            <div className="invoice-brand">Noyon <span>Telecom</span></div>
            <p>Wholesale Mobile Phone Spare Parts Importer &amp; Distributor</p>
            <p>Bashundhara City, Panthapath, Dhaka, Bangladesh</p>
            <p>Hotline: 01560-047377 · support@noyontelecom.com</p>
          </div>
          <div className="invoice-meta">
            <h1>INVOICE</h1>
            <p><strong>Invoice No:</strong> {invoiceNo}</p>
            <p><strong>Order ID:</strong> #{order.id}</p>
            <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
            <p><strong>Status:</strong> {order.status}</p>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <span className="invoice-label">Bill To</span>
            <p><strong>{ship.name || 'Customer'}</strong></p>
            <p>{ship.address}{ship.city ? `, ${ship.city}` : ''}</p>
            <p>{ship.phone}</p>
            <p>{ship.email || order.guestEmail}</p>
          </div>
          <div>
            <span className="invoice-label">Payment</span>
            <p>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            {order.transactionId && <p>Txn: {order.transactionId}</p>}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.productId}>
                <td>
                  <div className="invoice-item">
                    <img src={resolveImg(i.img)} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                    <span>{i.name}</span>
                  </div>
                </td>
                <td>{i.qty}</td>
                <td>{formatPrice(i.price)}</td>
                <td style={{ textAlign: 'right' }}>{formatPrice(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div><span>Discount</span><span>−{formatPrice(order.discount)}</span></div>}
          <div><span>Shipping</span><span>{formatPrice(order.shippingFee)}</span></div>
          {order.tax > 0 && <div><span>Tax</span><span>{formatPrice(order.tax)}</span></div>}
          <div className="invoice-grand-total"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <div className="invoice-footer">
          <p>Thank you for your business with Noyon Telecom. For wholesale/dealer support, contact us via WhatsApp or the hotline above.</p>
          <p className="invoice-generated">This is a system-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}
