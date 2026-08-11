import { useState } from 'react';
import { api, getRecaptchaToken } from '../api';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackRequestQuote } from '../ecommerce.js';
import { useLanguage } from '../context/LanguageContext';

export default function Contact() {
  const { t } = useLanguage();
  usePageMeta(t('contact.pageTitle'), t('contact.pageMeta'));
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
      showToast(t('contact.messageSent'), 'success');
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
        <span className="eyebrow">{t('contact.eyebrow')}</span>
        <h1 className="page-title">
          {t('contact.titleTop')} <em>{t('contact.titleEm')}</em>
        </h1>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <h3>{t('contact.contactDetails')}</h3>
          <p><strong>{t('contact.email')}</strong> mdsamirhossen180@gmail.com</p>
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
