const ITEMS = [
  {
    key: 'quality',
    title: 'Quality Assured',
    sub: 'We only sell original products',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'return',
    title: '7 Days Return',
    sub: 'Easy return & refund',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'price',
    title: 'Best Price Guarantee',
    sub: 'Get the best price always',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m20 12-8 8-9-9V4h7l10 10Z" strokeLinejoin="round" />
        <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'secure',
    title: 'Secure Payment',
    sub: 'Your payment is safe with us',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
      </svg>
    ),
  },
];

// Dark reassurance strip — presentational only, sits between the brand
// row and the footer on the homepage.
export default function HomeTrustBar() {
  return (
    <div className="home-trust-bar">
      {ITEMS.map((it) => (
        <div className="home-trust-item" key={it.key}>
          <span className="home-trust-icon">{it.icon}</span>
          <div>
            <strong>{it.title}</strong>
            <span>{it.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
