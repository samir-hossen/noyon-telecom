import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Exported so Home.jsx can reuse this exact copy for FAQPage structured
// data — one source of truth, so the schema can never drift out of sync
// with what's actually shown on the page (which Google would flag).
export const FAQS = [
  { q: 'Do you sell to individual retail customers?', a: 'No — Noyon Telecom is a wholesale-only importer & distributor. We sell exclusively to dealers, mobile repair shops, service centers, and distributors.' },
  { q: 'How do I get dealer pricing?', a: 'Register a free dealer account from the "Become a Dealer" link. Once approved (usually within 24 hours), dealer pricing and bulk discounts automatically apply to your account.' },
  { q: "What's the minimum order quantity (MOQ)?", a: 'MOQ varies by product and is shown on every product page. Many accessories and small parts have an MOQ of 5–10 units; larger components like displays are often MOQ 1.' },
  { q: 'Do parts come with a warranty?', a: 'Yes — warranty terms vary by product category (e.g. displays typically carry a testing warranty, batteries carry a defect warranty). Full terms are listed on each product page.' },
  { q: 'How can I place a bulk order or request a quote?', a: 'Use the "Request Quote" button on any product page, or message us directly on WhatsApp with your parts list for a fast wholesale quotation.' },
];

export default function FAQAccordion() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(0);

  return (
    <section className="section container">
      <div className="section-head">
        <h2 className="section-title">{t('home.faq')}</h2>
      </div>
      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={f.q}>
            <button
              className="faq-question"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              {f.q}
              <span className="faq-toggle" aria-hidden="true">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="faq-answer" id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
