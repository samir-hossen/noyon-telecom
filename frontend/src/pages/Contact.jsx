import { useState } from 'react';
import { api, getRecaptchaToken } from '../api';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackRequestQuote } from '../ecommerce.js';

export default function Contact() {
  usePageMeta('Contact Us', 'Get in touch with the Noyon Telecom team for support, orders, or general questions.');
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaToken('contact');
      await api.post('/contact', { ...form, recaptchaToken });
      trackRequestQuote();
      showToast("Message sent — we'll get back to you soon!", 'success');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">We're here to help</span>
        <h1 className="page-title">
          Get in <em>touch</em>
        </h1>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <h3>Contact details</h3>
          <p><strong>Email:</strong> mdsamirhossen180@gmail.com</p>
          <p><strong>Phone:</strong> +880 1560-047377</p>
          <p><strong>Address:</strong> House 12, Road 5, Kafrul, Dhaka, Bangladesh</p>
          <p><strong>Hours:</strong> Sat–Thu, 10am–7pm</p>
          <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#9a8f8a' }}>
            Prefer chat? Use the support button in the corner of the screen for WhatsApp, Messenger, or Telegram.
          </p>
        </div>

        <form onSubmit={onSubmit} className="form-panel wide">
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="contact-name">Your name</label>
            <input id="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="contact-email">Email</label>
            <input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" />
          </div>
          <button className="btn btn-berry" disabled={busy}>
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  );
}
