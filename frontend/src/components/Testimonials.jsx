import { useLanguage } from '../context/LanguageContext';

const REVIEWS = [
  { name: 'Rafiqul Islam', business: 'Islam Mobile Care, Dhaka', rating: 5, text: 'Genuine parts and fast delivery every time. Our repair shop relies on Noyon Telecom for displays and batteries.' },
  { name: 'Shamim Hossain', business: 'City Telecom, Chattogram', rating: 5, text: 'Dealer pricing and bulk discounts made a real difference to our margins. Support team is responsive on WhatsApp.' },
  { name: 'Tanvir Ahmed', business: 'Ahmed Electronics, Sylhet', rating: 4, text: 'Wide stock of back glass and camera modules across brands. Occasionally out of stock on rare models but overall solid.' },
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
          <div className="testimonial-card" key={r.name}>
            <div className="testimonial-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            <p className="testimonial-text">"{r.text}"</p>
            <div className="testimonial-author">
              <strong>{r.name}</strong>
              <span>{r.business}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
