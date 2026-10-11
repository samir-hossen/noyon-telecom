// A product's phone models as URL slugs ("Vivo Y21" -> "vivo-y21"), for the
// /model/<slug> hub pages. Only full model names count — ones that start
// with a brand ("Vivo Y21", "iPhone 14", "Samsung Galaxy A15"); a bare code
// like "A15" (brand unknown) never gets a hub of its own.
import { slugify } from './slug.js';
import { ALL_BRANDS } from '../config/catalog.js';

const LEAD_WORDS = new Set([...ALL_BRANDS.map((b) => b.toLowerCase().split(' ')[0]), 'iphone', 'ipad']);

// "(4G / 5G)" means both versions — the hub is the phone itself.
function hubName(model) {
  return String(model || '').replace(/\s*\((?:4G|5G)\s*\/\s*(?:4G|5G)\)/gi, '').trim();
}

export function modelSlugsFor(compatibleModels) {
  const list = Array.isArray(compatibleModels) ? compatibleModels : [];
  const slugs = list
    .map(hubName)
    .filter((m) => m && LEAD_WORDS.has(m.split(/\s+/)[0].toLowerCase()))
    .map((m) => slugify(m));
  return [...new Set(slugs)];
}
