// Public, verified business identity links. Keep these in one place so the
// Contact page, footer and post-purchase review prompt cannot drift apart.
export const GOOGLE_BUSINESS_URL = 'https://www.google.com/maps?cid=13875304182215759800';
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CbhXdqOj-47AEAI/review';

export const BUSINESS_ADDRESS_EN = '4/181 (5th Floor), Gulistan Shopping Complex, 2 B.B Avenue, Gulistan, Dhaka 1000, Bangladesh';
export const BUSINESS_ADDRESS_BN = '৪/১৮১ (৫ম তলা), গুলিস্তান শপিং কমপ্লেক্স, ২ বি.বি এভিনিউ, গুলিস্তান, ঢাকা-১০০০';

export function businessPageJsonLd(page, title, description) {
  return {
    '@context': 'https://schema.org',
    '@type': page === 'about' ? 'AboutPage' : 'ContactPage',
    '@id': `https://noyontelecom.com/${page}#page`,
    url: `https://noyontelecom.com/${page}`,
    name: title,
    description,
    isPartOf: { '@id': 'https://noyontelecom.com/#website' },
    mainEntity: { '@id': 'https://noyontelecom.com/#store' },
  };
}
