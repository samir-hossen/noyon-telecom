import { useLanguage } from '../context/LanguageContext';

const REVIEWS = [
  { key: 'testimonial1', rating: 5 },
  { key: 'testimonial2', rating: 5 },
  { key: 'testimonial3', rating: 4 },
];

export default function Testimonials() {
  const { t } = useLanguage();
  return (
    <section className="section container">
      <div className="section-head">
        <h2 className="section-title">{t('home.reviews')}</h2>
      </div>
      <div className="testimonial-grid">
        {REVIEWS.map((r) => (
          <div className="testimonial-card" key={r.key}>
            <div className="testimonial-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            <p className="testimonial-text">"{t(`${r.key}.text`)}"</p>
            <div className="testimonial-author">
              <strong>{t(`${r.key}.name`)}</strong>
              <span>{t(`${r.key}.business`)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
