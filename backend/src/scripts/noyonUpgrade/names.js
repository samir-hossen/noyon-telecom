// Product-name clean-up for the noyonUpgrade import (MASTER-PROMPT phase 4/5,
// rules in noyon-telecom-kit/docs/04-naming-and-pricing-guide.md):
// "{Brand} {Model} {Part}", brand first, no shop abbreviations, typos fixed,
// consistent casing and separators. Only safe fixes are automatic — callers
// decide what is "safe" (see buildImportFiles.js); this file just formats.
import { slugify } from '../../utils/slug.js';

export const BRAND_CANON = {
  samsung: 'Samsung', xiaomi: 'Xiaomi', vivo: 'Vivo', oppo: 'Oppo', realme: 'Realme', infinix: 'Infinix',
  tecno: 'Tecno', itel: 'Itel', huawei: 'Huawei', honor: 'Honor', motorola: 'Motorola', nokia: 'Nokia',
  oneplus: 'OnePlus', apple: 'Apple', 'google pixel': 'Google Pixel', google: 'Google Pixel', htc: 'HTC',
  asus: 'Asus', sony: 'Sony', blackberry: 'BlackBerry', nothing: 'Nothing', lg: 'LG', walton: 'Walton',
  symphony: 'Symphony',
};

export function canonicalBrand(brand) {
  return BRAND_CANON[String(brand || '').trim().toLowerCase()] || (brand ? String(brand).trim() : null);
}

// Shop abbreviations at the start of a name -> brand, and what replaces the
// abbreviation ("RM 8" -> Xiaomi "Redmi 8", "SAM A12" -> Samsung "Galaxy A12").
const ABBREVIATIONS = [
  [/^RM\b\s*/i, 'Xiaomi', 'Redmi '],
  [/^VV\b\s*/i, 'Vivo', ''],
  [/^OP\b\s*/i, 'Oppo', ''],
  [/^SAM\b\s*/i, 'Samsung', 'Galaxy '],
  [/^TEC\b\s*/i, 'Tecno', ''],
  [/^INF\b\s*/i, 'Infinix', ''],
  [/^ITEL\b\s*/i, 'Itel', ''],
  [/^REA\b\s*/i, 'Realme', ''],
  [/^vivo(?=y\d)/i, 'Vivo', ''], // "Vivoy18" typo
];

// Typos the owner listed as safe to fix.
const TYPOS = [
  [/\bRadme\b/gi, 'Redmi'],
  [/\bNot\b(?=\s*\d)/g, 'Note'],
  [/^(\d+)\s+C$/i, '$1C'], // "13 C" -> "13C"
];

// Series names that belong to exactly one brand (used only when a name has
// no brand at all and the market data agrees).
export const SERIES_BRAND = {
  redmi: 'Xiaomi', poco: 'Xiaomi', galaxy: 'Samsung', reno: 'Oppo', spark: 'Tecno', camon: 'Tecno',
  pova: 'Tecno', phantom: 'Tecno', hot: 'Infinix', zero: 'Infinix', smart: 'Infinix', vision: 'Itel',
  nord: 'OnePlus', mate: 'Huawei', nova: 'Huawei', iphone: 'Apple', ipad: 'Apple', pixel: 'Google Pixel', moto: 'Motorola',
};

// Upper-case words written in title case by the makers ("PRO" -> "Pro").
// Anything else in capitals (HD, TV, GT, SE, VIP, AMT…) is left alone.
const TITLE_WORDS = new Set([
  'pro', 'plus', 'lite', 'play', 'note', 'max', 'mini', 'zero', 'hot', 'smart', 'vision', 'pop', 'spark', 'camon',
  'pova', 'neo', 'prime', 'power', 'ultra', 'dual', 'edge', 'turbo', 'redmi', 'version', 'go', 'star', 'fold',
  'flip', 'mate', 'nova', 'nord', 'reno', 'find', 'galaxy', 'tab', 'pad', 'poco', 'phantom', 'magic', 'enjoy',
  'honor', 'moto', 'pixel', 'master', 'explorer', 'discovery', 'youth', 'active', 'core', 'pure', 'speed',
]);
const SPLIT_SUFFIX = /^(pro|plus|max|lite|play|prime|neo|ultra|core)$/i;
const LOWER_SUFFIX = new Set(['s', 'e', 'i', 't', 'x', 'k']);

export function fixToken(tok) {
  if (!tok) return tok;
  if (TITLE_WORDS.has(tok.toLowerCase()) && /^[A-Z]+$/.test(tok)) {
    return tok[0].toUpperCase() + tok.slice(1).toLowerCase();
  }
  // a3pro -> A3 Pro, y56 -> Y56, A3S -> A3s, V21E -> V21e, a5x -> A5x
  let m = tok.match(/^([A-Za-z]{1,2})(\d+)([A-Za-z]*)$/);
  if (m) {
    const [, prefix, digits, suffix] = m;
    const head = `${prefix.toUpperCase()}${digits}`;
    if (!suffix) return head;
    if (SPLIT_SUFFIX.test(suffix)) return `${head} ${suffix[0].toUpperCase()}${suffix.slice(1).toLowerCase()}`;
    if (suffix.length === 1) return head + (LOWER_SUFFIX.has(suffix.toLowerCase()) ? suffix.toLowerCase() : suffix.toUpperCase());
    return head + suffix;
  }
  // Number-first tokens keep the owner's casing (11x, 13C, 8T, 20i) — makers
  // differ — except a glued word: 11pro -> 11 Pro.
  m = tok.match(/^(\d+)([A-Za-z]+)$/);
  if (m && SPLIT_SUFFIX.test(m[2])) return `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`;
  return tok;
}

export function fixCasing(text) {
  return text.split(/\s+/).filter(Boolean).map(fixToken).join(' ');
}

const PART_WORDS = /\s*(?:—|–|-)?\s*\b(display|back glass|charging port|sim tray|logic board|flex)\b\s*$/i;

// Splits "Redmi 13 / 13C (4G / 5G)" on the slashes outside brackets.
export function splitModels(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === '/' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// "(4G / 5G)" in a name means both versions — the compatible-models list
// just names the phone.
function withoutBothNetworks(model) {
  return model.replace(/\s*\((?:4G|5G)\s*\/\s*(?:4G|5G)\)/gi, '').trim();
}

// "INF HOT 11 / HOT 11S / HOT 11 PLAY — Charging Port" -> { brand: 'Infinix',
// models: ['Hot 11', 'Hot 11s', 'Hot 11 Play'] } (models without the brand).
export function parseExistingName(name, brandField) {
  let brand = canonicalBrand(brandField);
  let base = String(name || '').split(/\s+—\s+/)[0];
  base = base.replace(PART_WORDS, '').trim();
  base = base.replace(/\((4G|5G)(?:\s*Version)?\)/gi, ' $1'); // "(4G Version)", "(4G)" -> "4G"
  for (const [re, abbrevBrand, replacement] of ABBREVIATIONS) {
    if (re.test(base)) {
      brand = brand || abbrevBrand;
      base = base.replace(re, replacement);
      break;
    }
  }
  for (const [re, rep] of TYPOS) base = base.replace(re, rep);
  const parts = splitModels(base).map((part, i) => {
    let p = part;
    // A follow-on with its own brand code ("REA 7i", "RM 9") is a full model
    // of that brand: "Realme 7i".
    if (i > 0) {
      for (const [re, abbrevBrand, replacement] of ABBREVIATIONS) {
        if (re.test(p)) {
          p = `${abbrevBrand} ${replacement}${p.replace(re, '')}`;
          break;
        }
      }
    }
    p = fixCasing(p);
    // "OPPO A1K" -> "Oppo A1k"
    const words = p.split(' ');
    const canon = BRAND_CANON[words[0].toLowerCase()];
    if (canon && !canon.includes(' ')) words[0] = canon;
    return words.join(' ');
  });
  return { brand, models: parts };
}

// Strip a leading brand word that's already in the model ("Vivo Y56" with
// brand Vivo -> "Y56"); "Redmi"/"Galaxy"/"Poco" are series, not brands, and stay.
export function stripBrand(model, brand) {
  if (!brand) return model;
  const words = brand === 'Google Pixel' ? ['google'] : [brand.toLowerCase()];
  let out = model;
  for (const w of words) out = out.replace(new RegExp(`^${w}\\s+`, 'i'), '');
  return out;
}

// Brand-specific series word the market always writes ("Samsung Galaxy A15",
// "Xiaomi Redmi 9A").
export function addSeries(model, brand) {
  if (brand === 'Samsung' && !/^galaxy\b/i.test(model) && /^(?:[AJMSFZ]\d|note\b|tab\b|xcover\b)/i.test(model)) {
    return `Galaxy ${model}`;
  }
  if (brand === 'Xiaomi' && /^\d/.test(model)) return `Redmi ${model}`;
  return model;
}

// Fill in the series for shorthand follow-on models: "Redmi 8 / 8A" ->
// "Redmi 8A"; "Redmi Note 8 / Note 8 Pro" -> "Redmi Note 8 Pro". A follow-on
// like "A2" (letter + number) gets the series unless the market data knows
// it as a phone on its own (`knownModel`): "Redmi A1 / A2" -> "Redmi A2",
// "Poco M3 / M4 Pro" -> "Poco M4 Pro", but "Narzo 30A / C25" stays "C25"
// (Realme C25).
export function expandFollowOn(first, next, knownModel = () => false) {
  const firstWords = first.split(' ');
  const seriesWords = [];
  for (const w of firstWords) {
    if (/\d/.test(w)) break;
    seriesWords.push(w);
  }
  if (/^\d/.test(next)) return seriesWords.length ? `${seriesWords.join(' ')} ${next}` : next;
  const nextFirst = next.split(' ')[0].toLowerCase();
  const idx = seriesWords.findIndex((w) => w.toLowerCase() === nextFirst);
  if (idx > 0) return `${seriesWords.slice(0, idx).join(' ')} ${next}`;
  if (seriesWords.length && /^[A-Za-z]+\d/.test(next)) {
    const withSeries = `${seriesWords.join(' ')} ${next}`;
    if (knownModel(withSeries) || !knownModel(next)) return withSeries;
  }
  return next;
}

// Display name of the brand in front of a model ("iPhone 13" has none).
export function brandPrefix(brand, model) {
  if (!brand) return '';
  if (brand === 'Apple' && /^(iphone|ipad|ipod|apple)\b/i.test(model)) return '';
  if (brand === 'Google Pixel') return /^google\b/i.test(model) ? '' : 'Google';
  return new RegExp(`^${brand}\\b`, 'i').test(model) ? '' : brand;
}

export function fullModelName(brand, model) {
  const prefix = brandPrefix(brand, model);
  return prefix ? `${prefix} ${model}` : model;
}

// Builds the clean product name + compatible-models list from a brand, the
// model strings as written in the name, and the part label.
export function buildName({ brand, models, part, knownModel }) {
  // The first model gets its series ("Galaxy", "Redmi"); follow-on models
  // keep the owner's shorthand in the name ("Redmi 8 / 8A / 8A Dual")…
  const cleaned = models.map((m, i) => (i === 0 ? addSeries(stripBrand(m, brand), brand) : m));
  const shownModels = cleaned.join(' / ');
  const name = `${fullModelName(brand, shownModels)} ${part}`.replace(/\s+/g, ' ').trim();
  // …while the compatible-models list spells every model out in full.
  const compatible = cleaned.map((raw, i) => {
    const m = withoutBothNetworks(raw);
    if (i === 0) return fullModelName(brand, m);
    // A follow-on that names its own brand ("Tecno Spark Go 2024") keeps it.
    const own = Object.keys(BRAND_CANON).find((b) => new RegExp(`^${b}\\b`, 'i').test(m));
    if (own) return m;
    const known = knownModel ? (model) => knownModel(fullModelName(brand, model)) : undefined;
    return fullModelName(brand, addSeries(expandFollowOn(withoutBothNetworks(cleaned[0]), m, known), brand));
  });
  return { name, compatibleModels: compatible };
}

export function modelSlug(fullModel) {
  return slugify(fullModel);
}

// Key used to tell whether two names mean the same phone model:
// lower-case, no brand words, no "galaxy", no punctuation.
export function modelKey(fullModel) {
  return String(fullModel || '')
    .toLowerCase()
    .replace(/\((4g|5g) version\)/g, '$1')
    .replace(/\b(samsung|galaxy|xiaomi|vivo|oppo|realme|infinix|tecno|itel|huawei|honor|motorola|nokia|oneplus|apple|google|htc|asus|sony|blackberry|nothing|lg)\b/g, ' ')
    .replace(/[^a-z0-9+]+/g, '');
}
