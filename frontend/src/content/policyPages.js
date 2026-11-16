// Existing published policy text lives in translations.js. Both the React
// pages and build-time HTML use this outline so the promises cannot drift.
const p = (...parts) => ({ type: 'p', parts });
const list = (type, ...items) => ({ type, items: items.map((item) => Array.isArray(item) ? item : [item]) });
const link = (href, key) => ({ href, key });
const contact = link('/contact/', 'terms.s10Link');
const questions = (section) => p(`s${section}BodyPre`, contact, `s${section}BodyPost`);

export const POLICY_PAGES = {
  delivery: {
    slug: 'delivery-policy', updated: 'September 2026',
    sections: [
      [p('s1Body')],
      [list('ul', 's2Item1', 's2Item2', 's2Item3'), p('s2Note')],
      [p('s3Body')], [p('s4Body')],
      [p('s5BodyPre', link('/orders', 's5Link'), 's5BodyPost')],
      [questions(6)],
    ],
  },
  warranty: {
    slug: 'warranty-policy', updated: 'September 2026',
    sections: [
      [p('s1Body')],
      [list('ul', 's2Item1', 's2Item2', 's2Item3')],
      [list('ul', 's3Item1', 's3Item2', 's3Item3', 's3Item4')],
      [list('ol', ['s4Step1Pre', contact, 's4Step1Post'], 's4Step2', 's4Step3')],
      [p('s5Body')], [questions(6)],
    ],
  },
  refund: {
    slug: 'refund-policy', updated: 'August 2026',
    sections: [
      [p('s1Body')],
      [list('ol', ['s2Step1Pre', contact, 's2Step1Post'], 's2Step2', 's2Step3', 's2Step4')],
      [p('s3Body')], [p('s4Body')],
      [list('ul', 's5Item1', 's5Item2', 's5Item3')],
      [p('s6Body')], [questions(7)],
    ],
  },
  privacy: {
    slug: 'privacy-policy', updated: 'August 2026',
    sections: [
      [p('s1Body')],
      [list('ul', 's2Item1', 's2Item2', 's2Item3', 's2Item4', 's2Item5')],
      [p('s3Body')], [p('s4Body')], [p('s5Body')], [p('s6Body')],
      [p('s7BodyPre', contact, { text: '.' })],
    ],
  },
  terms: {
    slug: 'terms', updated: 'August 2026',
    sections: [
      [p('s1Body')], [p('s2Body')], [p('s3Body')], [p('s4Body')], [p('s5Body')],
      [p('s6BodyPre', link('/refund-policy/', 's6Link'), 's6BodyPost')],
      [p('s7Body')], [p('s8Body')], [p('s9Body')],
      [p('s10BodyPre', contact, { text: '.' })],
    ],
  },
};

export function policyPageContent(key, translate) {
  const policy = POLICY_PAGES[key];
  const t = (name) => translate(name.includes('.') ? name : `${key}.${name}`);
  const text = (name) => t(name).replace(/{{days}}/g, () => t('s1Days'));
  const parts = (items) => items.map((item) => typeof item === 'string'
    ? { text: text(item) }
    : item.key ? { text: text(item.key), href: item.href } : item);
  return {
    path: `/${policy.slug}/`,
    title: t('pageTitle'), description: t('pageMeta'),
    updated: translate('terms.lastUpdated').replace('{{date}}', policy.updated),
    sections: policy.sections.map((blocks, index) => ({
      title: t(`s${index + 1}Title`),
      blocks: blocks.map((block) => block.type === 'p'
        ? { type: 'p', parts: parts(block.parts) }
        : { type: block.type, items: block.items.map(parts) }),
    })),
  };
}

export function policyPageJsonLd(page) {
  return {
    '@context': 'https://schema.org', '@type': 'WebPage',
    '@id': `https://noyontelecom.com${page.path}#page`,
    url: `https://noyontelecom.com${page.path}`,
    name: page.title, description: page.description,
    isPartOf: { '@id': 'https://noyontelecom.com/#website' },
    about: { '@id': 'https://noyontelecom.com/#store' },
  };
}
