import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Exported so Home.jsx can reuse this exact copy for FAQPage structured
// data — one source of truth, so the schema can never drift out of sync
// with what's actually shown on the page (which Google would flag).
export const FAQS = [
  { qKey: 'faq1.q', aKey: 'faq1.a' },
  { qKey: 'faq2.q', aKey: 'faq2.a' },
  { qKey: 'faq3.q', aKey: 'faq3.a' },
  { qKey: 'faq4.q', aKey: 'faq4.a' },
  { qKey: 'faq5.q', aKey: 'faq5.a' },
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
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={f.qKey}>
            <button
              className="faq-question"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              {t(f.qKey)}
              <span className="faq-toggle" aria-hidden="true">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="faq-answer" id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>
                {t(f.aKey)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
