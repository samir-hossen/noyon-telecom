// Quality options: one product sold in several grades, each with its own
// price — e.g. a display as "High Quality ৳999" and "Original ৳1,699"
// (owner, 11 Oct 2026: show them like the market does). Stored on
// Product.qualityOptions as [{ label, price }]; Product.price is the cheapest
// one, so sorting, cards ("৳999 – ৳1,699") and feeds keep working.

export const MAX_QUALITY_OPTIONS = 8;
const MAX_LABEL_LENGTH = 40;

// Supplier grade names -> the names shown on our pages.
const LABELS = {
  'original': 'Original',
  'original quality': 'Original',
  'original oem': 'Original',
  'set original': 'Original',
  'market original': 'Market Original',
  'high quality': 'High Quality',
  'market quality': 'Market Quality',
  'copy': 'Copy',
  'ips': 'IPS',
};

export function qualityLabel(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ');
  return LABELS[text.toLowerCase()] || text;
}

// The list as stored and served: priced options only, one per label (the
// cheapest if a label repeats), cheapest first.
export function normalizeQualityOptions(list) {
  if (!Array.isArray(list)) return [];
  const byLabel = new Map();
  for (const o of list) {
    const label = String(o?.label ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_LABEL_LENGTH);
    const price = Math.round(Number(o?.price));
    if (!label || !Number.isFinite(price) || price <= 0) continue;
    const key = label.toLowerCase();
    if (!byLabel.has(key) || price < byLabel.get(key).price) byLabel.set(key, { label, price });
  }
  return [...byLabel.values()].sort((a, b) => a.price - b.price).slice(0, MAX_QUALITY_OPTIONS);
}

// The market option lists in the kit data, with the owner's rule price after
// the arrow ("manual" = the rule can't price it):
//   "High Quality 1199 -> 999 | Original 1899 -> 1699"
//   "Vivo Y18 [Market Quality] 1649 -> 1449 | Vivo Y18 [Original Quality] 1899 -> 1699"
const PLAIN = /^(.+?)\s+(\d+)\s*->\s*(\d+|manual)$/i;
const BRACKETED = /^(.*?)\s*\[([^\]]+)\]\s*(\d+)\s*->\s*(\d+|manual)$/i;

export function parseOptionList(text) {
  const out = [];
  for (const part of String(text || '').split(' | ')) {
    const s = part.trim();
    const b = s.match(BRACKETED);
    const m = b ? { model: b[1].trim(), label: b[2], market: b[3], rule: b[4] } : (() => {
      const p = s.match(PLAIN);
      return p ? { model: '', label: p[1], market: p[2], rule: p[3] } : null;
    })();
    if (!m) continue;
    out.push({
      model: m.model,
      label: m.label.trim(),
      market: Number(m.market),
      price: /^\d+$/.test(m.rule) ? Number(m.rule) : null,
    });
  }
  return out;
}

// Quality options for a product from its market option list(s): only when
// the market sells it in more than one grade (one model only), using the
// owner's rule price of each grade. Grades the rule can't price are left out.
export function qualityOptionsFromMarket(texts) {
  const parsed = (Array.isArray(texts) ? texts : [texts]).flatMap(parseOptionList);
  const grades = new Set(parsed.filter((o) => o.label !== '(single option)').map((o) => qualityLabel(o.label).toLowerCase()));
  const models = new Set(parsed.map((o) => o.model.toLowerCase()));
  if (grades.size < 2 || models.size > 1) return [];
  const options = normalizeQualityOptions(parsed.filter((o) => o.price && o.label !== '(single option)').map((o) => ({ label: qualityLabel(o.label), price: o.price })));
  return looksWrong(options) ? [] : options;
}

// Market data that can't be right: "Original" cheaper than a copy grade
// (e.g. a fold display at Original ৳3,629 but High Quality ৳17,799). Such a
// product shows "দাম জানতে WhatsApp করুন" instead of wrong prices.
export function looksWrong(options) {
  const original = options.find((o) => o.label === 'Original');
  return Boolean(original) && options.some((o) => o.label !== 'Original' && o.price > original.price);
}

export const QUALITY_ORDER_MESSAGE = 'এই পার্টসটা কয়েকটা কোয়ালিটিতে পাওয়া যায় — কোয়ালিটি বলে WhatsApp-এ অর্ডার করুন। (Please order this part on WhatsApp with the quality you want.)';

export function hasQualityOptions(product) {
  return Array.isArray(product?.qualityOptions) && product.qualityOptions.length > 0;
}
