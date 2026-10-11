// Builds the review files for the noyonUpgrade import (MASTER-PROMPT
// phases 3–5). Reads the kit's data, writes JSON/CSV under --out; never
// touches a database.
//
//   phase 3  drafts-existing.json   hidden draft price for every existing product
//   phase 4  name-fixes.csv/.json   clean names (+ new slugs, brand, compatible models)
//   phase 5  new-products.json      every missing product A–Z except Battery
//
// Usage (from website/backend):
//   node src/scripts/noyonUpgrade/buildImportFiles.js --kit ../../noyon-telecom-kit --out ../../import [--phases 3,4,5]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCsv, writeCsv } from './csv.js';
import { parseExistingName, buildName, canonicalBrand, SERIES_BRAND, modelKey, fixCasing } from './names.js';
import { slugify } from '../../utils/slug.js';
import { findDisabledCategory } from '../../config/catalog.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const KIT = path.resolve(arg('kit', '../../noyon-telecom-kit'));
const OUT = path.resolve(arg('out', '../../import'));
const PHASES = new Set(arg('phases', '3,4').split(',').map((s) => s.trim()));
const DATA = path.join(KIT, 'data');
// Price matches: the kit's file, or (better) the re-match on clean names
// from rematchCleanNames.js.
const REFERENCE = path.resolve(arg('reference', path.join(OUT, 'price-reference-clean-names.csv')));
const RULE_VERSION = 'owner-rule-2026-10';
const TEST_PRODUCT_SLUG = '1234';

// ---------- market index: which brands sell a phone model ----------
// Same key and prefix idea as the kit's match_prices.py, but over EVERY etel
// part type — a bare "8A" is Xiaomi Redmi 8A *and* Honor 8A, even if only one
// of them shows up for one part type.
const KIT_BRAND_WORDS = /\b(samsung|galaxy|xiaomi|vivo|oppo|realme|infinix|tecno|itel|huawei|honor|motorola|nokia|oneplus|apple|google|asus|sony|htc|blackberry|lg|nothing)\b/g;
const KIT_PREFIXES = ['', 'redmi', 'redminote', 'moto', 'poco', 'mi', 'note', 'spark', 'pop', 'camon', 'hot', 'smart', 'iphone', 'nova', 'reno'];

function kitKey(s) {
  return String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(KIT_BRAND_WORDS, ' ').replace(/[^a-z0-9+]+/g, '');
}

function buildBrandIndex(etelRows) {
  const index = new Map();
  for (const r of etelRows) {
    if (!r.model || ['Accessories', 'Phones'].includes(r.brand)) continue;
    const k = kitKey(r.model);
    exactModels.add(`${r.brand}|${k}`);
    exactModels.add(`${r.brand}|${k.replace(/(4g|5g)$/, '')}`);
    for (const kk of new Set([k, k.replace(/(4g|5g)$/, '')])) {
      if (!index.has(kk)) index.set(kk, new Set());
      index.get(kk).add(r.brand);
    }
  }
  return index;
}

// "brand|key" of every model the market data has, for exact lookups.
const exactModels = new Set();

function knownModelFor(brand) {
  return (fullModel) => {
    const k = kitKey(fullModel);
    return exactModels.has(`${brand}|${k}`) || exactModels.has(`${brand}|${k.replace(/(4g|5g)$/, '')}`);
  };
}

function marketBrands(index, model) {
  const k = kitKey(model);
  const brands = new Set();
  for (const pre of KIT_PREFIXES) for (const b of index.get(pre + k) || []) brands.add(b);
  return [...brands].sort();
}

// ---------- phase 4: names ----------
// Shown to the owner instead of guessed (MASTER-PROMPT phase 4).
const OWNER_LISTED_AMBIGUOUS = new Set(['a15', 'a11', 'a12', 'c12', '9a', 'note7', 'c11', 'a16']);
const MODEL_CODE = /^(X\d{3,4}[A-Z]?|K[A-Z]\d|L[A-Z]\d)$/i; // Infinix X…, Tecno K…/L… codes
// Samsung SM- codes with a known marketing name (kit's reference file).
const SAMSUNG_CODES = {
  j720: { models: ['Galaxy J7 Duo (J720)'], note: 'Samsung SM-J720 = Galaxy J7 Duo' },
  j710: { models: ['Galaxy J7 2016 (J710)'], note: 'Samsung SM-J710 = Galaxy J7 (2016)' },
  m336: { models: ['Galaxy M33 5G (M336)'], note: 'Samsung SM-M336 = Galaxy M33 5G' },
  j4: { models: ['Galaxy J4'], note: 'Galaxy J4 (only Samsung has a J4)' },
};
const PURE_NUMBER_BRANDS = new Set(['Vivo', 'Oppo', 'Samsung', 'Tecno', 'Infinix', 'Itel']);
// Brands the kit's own docs already give for names the market data lacks
// (docs/03 audit table: "13 C Display" -> Xiaomi Redmi 13C; docs/04 §B2:
// "Samsung A13 5G").
const KIT_DOC_BRANDS = {
  '13c': { brand: 'Xiaomi', note: 'kit docs/03: "13 C Display" = Xiaomi Redmi 13C' },
  a135g: { brand: 'Samsung', note: 'kit docs/04 §B2: Samsung A13 5G' },
};

function partLabelFor(product) {
  const cat = product.category || (product.categories || [])[0] || '';
  return cat;
}

function decideName(product, brandIndex) {
  const part = partLabelFor(product);
  if (product.slug === TEST_PRODUCT_SLUG) {
    return { status: 'unpublish', reason: 'Test/junk product (name "Note 9", SKU 1111, ৳333)' };
  }
  const parsed = parseExistingName(product.name, product.brand);
  let { brand } = parsed;
  let { models } = parsed;
  let note = '';
  const firstKey = kitKey(models[0] || '');

  if (!brand) {
    const code = SAMSUNG_CODES[firstKey];
    if (code) {
      brand = 'Samsung';
      models = code.models;
      note = code.note;
    } else if (KIT_DOC_BRANDS[firstKey] && models.length === 1) {
      ({ brand, note } = KIT_DOC_BRANDS[firstKey]);
    } else if (models.some((m) => MODEL_CODE.test(m.replace(/\s+/g, '')))) {
      return { status: 'needs-owner', kind: 'model-code', reason: 'Model code only — the marketing name must be checked on the phone (Settings → About) or the supplier label' };
    } else if (models.some((m) => OWNER_LISTED_AMBIGUOUS.has(kitKey(m)))) {
      const options = [...new Set(models.flatMap((m) => marketBrands(brandIndex, m)))];
      return { status: 'needs-owner', kind: 'ambiguous-brand', options, reason: `Brand unclear — the same model exists from ${options.join(' / ') || 'several brands'}` };
    } else {
      const candidates = [...new Set(models.flatMap((m) => marketBrands(brandIndex, m)))];
      if (candidates.length === 1) {
        brand = candidates[0];
        note = `brand from market data (only ${brand} has this model)`;
      } else if (candidates.length > 1) {
        return { status: 'needs-owner', kind: 'ambiguous-brand', options: candidates, reason: `Brand unclear — the same model exists from ${candidates.join(' / ')}` };
      } else {
        const series = SERIES_BRAND[(models[0] || '').split(' ')[0].toLowerCase()];
        if (series) {
          brand = series;
          note = `brand from the series name "${models[0].split(' ')[0]}"`;
        } else {
          return { status: 'needs-owner', kind: 'unknown-model', reason: 'No brand in the name and the model is not in the market data' };
        }
      }
    }
  }
  brand = canonicalBrand(brand);
  if (PURE_NUMBER_BRANDS.has(brand) && models.some((m) => /^\d+$/.test(m.replace(new RegExp(`^${brand}\\s+`, 'i'), '')))) {
    return { status: 'needs-owner', kind: 'unknown-model', brand, reason: `"${models.join(' / ')}" is not a full ${brand} model name` };
  }
  const built = buildName({ brand, models, part, knownModel: knownModelFor(brand) });
  return { status: 'auto-fix', brand, name: built.name, compatibleModels: built.compatibleModels, note };
}

function samePlainList(a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || []);
}

function buildNameFixes(products, brandIndex) {
  const usedSlugs = new Set(products.map((p) => p.slug).filter(Boolean));
  const fixes = [];
  for (const p of products) {
    const d = decideName(p, brandIndex);
    const row = {
      id: p.id,
      slug: p.slug,
      category: p.category,
      old_name: p.name,
      new_name: p.name,
      new_slug: p.slug,
      old_brand: p.brand || '',
      brand: p.brand || '',
      old_compatibleModels: p.compatibleModels || [],
      compatibleModels: p.compatibleModels || [],
      status: d.status,
      note: d.reason || d.note || '',
      options: d.options || [],
      kind: d.kind || '',
    };
    if (d.status === 'auto-fix') {
      row.new_name = d.name;
      row.brand = d.brand;
      row.compatibleModels = d.compatibleModels;
      const changed = row.new_name !== p.name || row.brand !== (p.brand || '') || !samePlainList(row.compatibleModels, p.compatibleModels);
      if (!changed) row.status = 'unchanged';
      const wanted = slugify(row.new_name);
      if (wanted !== p.slug) {
        let candidate = wanted;
        let n = 2;
        while (usedSlugs.has(candidate)) candidate = `${wanted}-${n++}`;
        usedSlugs.add(candidate);
        row.new_slug = candidate;
      }
    }
    fixes.push(row);
  }
  return fixes;
}

// ---------- phase 3: hidden draft prices for existing products ----------
function num(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildDrafts(products, refBySlug) {
  return products.map((p) => {
    const r = refBySlug.get(p.slug) || {};
    const current = num(p.price);
    const draft = num(r.draft_price_bdt);
    const flag = r.draft_flag || '';
    const matched = r.match_status === 'MATCH';
    const options = (r.draft_all_options || '').split(' | ').filter(Boolean);
    let priceNote;
    if (p.slug === TEST_PRODUCT_SLUG) {
      return { id: p.id, slug: p.slug, name: p.name, category: p.category, currentPrice: current, draftPrice: null, referencePrice: null,
        priceNote: 'test product — unpublished', priceStatus: 'draft', flag: 'TEST PRODUCT', matchStatus: r.match_status || '', unpublish: true };
    }
    if ((r.draft_source || '').startsWith('etel')) {
      priceNote = `${r.draft_source} · ${RULE_VERSION}${options.length > 1 ? ` · all options: ${options.join(' | ')}` : ''}`;
    } else if ((r.draft_source || '').startsWith('kept current')) {
      priceNote = `kept the current price ৳${current} as the draft (no usable market match${r.match_status === 'AMBIGUOUS BRAND' ? ' — brand unclear' : ''}) · ${RULE_VERSION}`;
    } else if (flag.startsWith('SET MANUALLY')) {
      priceNote = `market ${r.etel_lowest_retail_bdt} [${r.etel_lowest_option}] — SET MANUALLY: the rule gives too low a price · ${RULE_VERSION}`;
    } else if (r.match_status === 'AMBIGUOUS BRAND') {
      priceNote = `brand unclear (${r.etel_brand}) — fix the brand, then re-run · ${RULE_VERSION}`;
    } else {
      priceNote = `no market price found — set the price yourself · ${RULE_VERSION}`;
    }
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      currentPrice: current,
      draftPrice: draft,
      referencePrice: matched ? num(r.etel_lowest_retail_bdt) : null,
      priceNote,
      priceStatus: 'draft',
      flag: flag || (draft ? '' : 'NO DRAFT'),
      matchStatus: r.match_status || 'NO MATCH',
      unpublish: Boolean(findDisabledCategory(p.categories || p.category)),
    };
  });
}

// ---------- OWNER-QUESTIONS.md generated block ----------
function replaceGeneratedBlock(file, block) {
  const start = '<!-- GENERATED:START -->';
  const end = '<!-- GENERATED:END -->';
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `# OWNER-QUESTIONS\n\n${start}\n${end}\n`;
  if (!current.includes(start) || !current.includes(end)) throw new Error(`${file} has no generated block markers`);
  const before = current.slice(0, current.indexOf(start) + start.length);
  const after = current.slice(current.indexOf(end));
  fs.writeFileSync(file, `${before}\n${block}\n${after}`, 'utf8');
}

function ownerQuestionsBlock({ fixes, drafts }) {
  const lines = [];
  const needs = fixes.filter((f) => f.status === 'needs-owner');
  const byKind = (k) => needs.filter((f) => f.kind === k);
  lines.push('## A. Product names I did not change (need your answer)', '');
  lines.push('### A1. Brand unclear — which brand is it?', '', '| Product now | Possible brands | Your answer |', '|---|---|---|');
  for (const f of byKind('ambiguous-brand')) lines.push(`| ${f.old_name} | ${f.options.join(' / ') || '?'} |  |`);
  lines.push('', '### A2. Model code only — what is the phone\'s marketing name?', '', '(Check the phone: Settings → About phone, or the supplier\'s label. The code stays in brackets in the new name, e.g. `Infinix Smart 7 HD (X6516) Display`.)', '', '| Product now | Possible name (please verify) | Your answer |', '|---|---|---|');
  for (const f of byKind('model-code')) lines.push(`| ${f.old_name} | ${MODEL_CODE_HINTS[kitKey(f.old_name.replace(/\s*display$/i, ''))] || '—'} |  |`);
  lines.push('', '### A3. Model unclear', '', '| Product now | Problem | Your answer |', '|---|---|---|');
  for (const f of byKind('unknown-model')) lines.push(`| ${f.old_name} | ${f.reason} |  |`);
  lines.push('');

  const manual = drafts.filter((d) => d.flag.startsWith('SET MANUALLY'));
  lines.push(`## B. Existing products with no draft price — "SET MANUALLY" (${manual.length})`, '');
  lines.push('The owner\'s rule (market price − ৳200…৳700) gives less than half the market price for these cheap parts, so their draft is left empty. Set the price in the admin panel, or give me a separate rule for small parts (e.g. "market price − 20%").', '');
  const byCat = new Map();
  for (const d of manual) {
    if (!byCat.has(d.category)) byCat.set(d.category, []);
    byCat.get(d.category).push(d);
  }
  for (const [cat, rows] of [...byCat.entries()].sort()) {
    lines.push(`<details><summary>${cat} — ${rows.length}</summary>`, '');
    for (const d of rows) lines.push(`- ${d.name} — market ৳${(d.priceNote.match(/market (\d+)/) || [])[1] || '?'}`);
    lines.push('', '</details>', '');
  }

  const none = drafts.filter((d) => !d.draftPrice && d.priceNote.startsWith('no market price'));
  lines.push(`## C. Existing products with no market price and no current price (${none.length})`, '');
  lines.push('These were not found in the market data and had ৳0, so there is nothing to base a draft on. Set the price in the admin panel when you are ready (the page shows "দাম জানতে WhatsApp করুন" until then).', '');
  const noneByCat = new Map();
  for (const d of none) {
    if (!noneByCat.has(d.category)) noneByCat.set(d.category, []);
    noneByCat.get(d.category).push(d);
  }
  for (const [cat, rows] of [...noneByCat.entries()].sort()) {
    lines.push(`<details><summary>${cat} — ${rows.length}</summary>`, '');
    for (const d of rows) lines.push(`- ${d.name}`);
    lines.push('', '</details>', '');
  }
  return lines.join('\n');
}

// Hints for model codes — shown as "please verify", never used to rename.
// From public device listings (GSMArena, iFixit, Hovatek, retailer pages).
const MODEL_CODE_HINTS = {
  x6516: 'Infinix Smart 7 HD',
  x6515: 'Infinix Smart 7',
  x688: 'Infinix Hot 10 Play (X688B) — check the letter after X688',
  x6720: 'not found — please check the phone',
  ke5: 'Tecno Spark Go 2020',
  kg5: 'Tecno Spark 8C (KG5j/KG5k) or Spark 9 (KG5P) — check the letter after KG5',
  kl4: 'Tecno Spark Go 1',
  kl5: 'Tecno Spark 30C (weak source)',
  km4: 'Tecno Spark Go 2',
  km5: 'Tecno Spark 40',
  lc7: 'Tecno Pouvoir 4',
};

// ---------- main ----------
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const products = JSON.parse(fs.readFileSync(path.join(DATA, 'noyon_products.json'), 'utf8'));
  const refFile = fs.existsSync(REFERENCE) ? REFERENCE : path.join(DATA, 'noyon_price_reference_all.csv');
  const refBySlug = new Map(readCsv(refFile).map((r) => [r.noyon_slug, r]));
  const brandIndex = buildBrandIndex(readCsv(path.join(DATA, 'etel_all_products.csv')));
  const summary = { builtAt: new Date().toISOString(), products: products.length, priceReference: path.basename(refFile) };

  const drafts = buildDrafts(products, refBySlug);
  const fixes = buildNameFixes(products, brandIndex);

  if (PHASES.has('3')) {
    fs.writeFileSync(path.join(OUT, 'drafts-existing.json'), JSON.stringify(drafts, null, 1));
    summary.drafts = {
      total: drafts.length,
      withDraft: drafts.filter((d) => d.draftPrice).length,
      fromMarket: drafts.filter((d) => d.priceNote.startsWith('etel')).length,
      keptCurrent: drafts.filter((d) => d.priceNote.startsWith('kept')).length,
      setManually: drafts.filter((d) => d.flag.startsWith('SET MANUALLY')).length,
      noDraftOther: drafts.filter((d) => !d.draftPrice && !d.flag.startsWith('SET MANUALLY')).length,
      unpublish: drafts.filter((d) => d.unpublish).length,
    };
  }
  if (PHASES.has('4')) {
    const cols = ['slug', 'old_name', 'new_name', 'new_slug', 'brand', 'compatibleModels', 'status', 'note'];
    writeCsv(path.join(OUT, 'name-fixes.csv'), fixes, cols);
    fs.writeFileSync(path.join(OUT, 'name-fixes.json'), JSON.stringify(fixes, null, 1));
    const count = (s) => fixes.filter((f) => f.status === s).length;
    summary.names = {
      autoFix: count('auto-fix'),
      unchanged: count('unchanged'),
      needsOwner: count('needs-owner'),
      unpublish: count('unpublish'),
      slugChanges: fixes.filter((f) => f.new_slug !== f.slug).length,
      brandFilled: fixes.filter((f) => f.status === 'auto-fix' && !f.old_brand && f.brand).length,
    };
  }
  if (PHASES.has('3') || PHASES.has('4')) {
    replaceGeneratedBlock(path.join(OUT, '..', 'OWNER-QUESTIONS.md'), ownerQuestionsBlock({ fixes, drafts }));
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

export { kitKey, marketBrands, buildBrandIndex, decideName, fixCasing };

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
