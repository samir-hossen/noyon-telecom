import { useState, useEffect } from 'react';
import { api, getRecaptchaToken } from '../api';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackRequestQuote } from '../ecommerce.js';
import { useLanguage } from '../context/LanguageContext';
import { BUSINESS_HOURS } from '../content/businessHours.js';

// `facebookUrl` is null until the settings fetch below resolves (or stays
// null forever if it's not configured) — sameAs is only included once it's
// a real value, since an empty string there would be invalid structured data.
function buildLocalBusinessJsonLd(facebookUrl) {
  return {
    id: 'local-business',
    data: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'Noyon Telecom',
      image: 'https://noyontelecom.com/apple-touch-icon.png',
      url: 'https://noyontelecom.com',
      telephone: '+880-1560-047377',
      priceRange: '৳৳',
      ...(facebookUrl ? { sameAs: [facebookUrl] } : {}),
      address: {
        '@type': 'PostalAddress',
        streetAddress: '4/181 (5th Floor), Gulistan Shopping Complex, 2 B.B Avenue, Gulistan',
        addressLocality: 'Dhaka',
        postalCode: '1000',
        addressCountry: 'BD',
      },
      // Sourced from content/businessHours.js — same single source of truth
      // as the navbar hotline line and homepage trust strip, so this
      // structured data can never drift from what's actually displayed.
      // Never invent geo-coordinates Google can't verify against the
      // storefront itself.
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: BUSINESS_HOURS.days,
        opens: BUSINESS_HOURS.opens,
        closes: BUSINESS_HOURS.closes,
      },
    },
  };
}

export default function Contact() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Both fetched from backend config rather than hardcoded here — email
  // used to show a personal Gmail address baked straight into frontend
  // source, and the Facebook URL was duplicated in three separate files.
  const [contactEmail, setContactEmail] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');

  useEffect(() => {
    api.get('/settings/public').then((d) => {
      setContactEmail(d.contactEmail);
      setFacebookUrl(d.facebookUrl || '');
    }).catch(() => {});
  }, []);

  usePageMeta(t('contact.pageTitle'), t('contact.pageMeta'), null, null, buildLocalBusinessJsonLd(facebookUrl));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaToken('contact');
      await api.post('/contact', { ...form, recaptchaToken });
      trackRequestQuote();
      showToast(t('contact.messageSent'), 'success');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('contact.eyebrow')}</span>
        <h1 className="page-title">
          {t('contact.titleTop')} <em>{t('contact.titleEm')}</em>
        </h1>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <h3>{t('contact.contactDetails')}</h3>
          {contactEmail && <p><strong>{t('contact.email')}</strong> {contactEmail}</p>}
          <p><strong>{t('contact.phone')}</strong> +880 1560-047377</p>
          <p><strong>{t('contact.address')}</strong> ৪/১৮১ (৫ম তলা), গুলিস্তান শপিং কমপ্লেক্স, ২ বি.বি এভিনিউ, গুলিস্তান, ঢাকা-১০০০</p>
          <p><strong>{t('contact.hours')}</strong> {t('contact.hoursValue')}</p>
          <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#9a8f8a' }}>
            {t('contact.preferChat')}
          </p>
        </div>

        <form onSubmit={onSubmit} className="form-panel wide">
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="contact-name">{t('contact.yourName')}</label>
            <input id="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="contact-email">{t('auth.email')}</label>
            <input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="contact-phone">{t('checkout.phone')}</label>
            <input id="contact-phone" type="tel" required placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="contact-message">{t('contact.message')}</label>
            <textarea id="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('contact.messagePlaceholder')} />
          </div>
          <button className="btn btn-berry" disabled={busy}>
            {busy ? t('contact.sending') : t('contact.sendMessage')}
          </button>
        </form>
      </div>
    </div>
  );
}
