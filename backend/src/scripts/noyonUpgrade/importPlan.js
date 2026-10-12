// What applyImport.js changes, as pure functions (no database), so the rules
// are unit-tested (importPlan.test.js).
//
// The import files were built from the catalog as it was on 11 Oct 2026. The
// owner may keep working in admin until the import runs: a price, name, brand
// or description that is neither the 11 Oct value nor ours was changed there,
// and the owner's value is kept.
import { modelSlugsFor } from '../../utils/modelSlugs.js';
import { findDisabledCategory, isDisabledPartName } from '../../config/catalog.js';
import { normalizeQualityOptions, hasQualityOptions } from '../../utils/qualityOptions.js';

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const priceOrNull = (x) => (Number(x) > 0 ? Number(x) : null);
const textOrNull = (x) => (x ? String(x) : null);

export function editedSince(now, then, ours) {
  return !same(now, then) && !same(now, ours);
}

// Existing products. `snapshot` (id -> product on 11 Oct) is only needed for
// descriptions; the other files carry their old values (currentPrice,
// old_name, old_brand). Each plan lists what it `kept` from the owner.
export function planExisting(dbProducts, { drafts = [], fixes = [], descriptions = [], snapshot = null, publish = true } = {}) {
  const draftById = new Map(drafts.map((d) => [d.id, d]));
  const fixById = new Map(fixes.map((f) => [f.id, f]));
  const descById = new Map((descriptions || []).map((d) => [d.id, d.desc]));
  const plans = [];
  for (const p of dbProducts) {
    const d = draftById.get(p.id);
    const f = fixById.get(p.id);
    if (!d && !f) continue;
    const data = {};
    const kept = [];
    if (d) {
      data.draftPrice = d.draftPrice;
      data.referencePrice = d.referencePrice;
      data.priceNote = d.priceNote;
      const now = priceOrNull(p.price);
      if (editedSince(now, priceOrNull(d.currentPrice), priceOrNull(d.publishPrice))) {
        // Typed (or cleared) in admin after 11 Oct: that price stands.
        kept.push('price');
        data.priceStatus = publish && now ? 'published' : 'draft';
      } else if (publish && d.publishPrice) {
        data.price = d.publishPrice;
        data.priceStatus = 'published';
        if (d.publishOptions?.length) data.qualityOptions = normalizeQualityOptions(d.publishOptions);
      } else {
        data.priceStatus = 'draft';
      }
    }
    let redirectFrom = null;
    if (f && f.status === 'auto-fix') {
      if (editedSince(p.name, f.old_name, f.new_name) || editedSince(textOrNull(p.brand), textOrNull(f.old_brand), textOrNull(f.brand))) {
        kept.push('name');
      } else {
        if (f.new_name !== p.name) data.name = f.new_name;
        if ((f.brand || null) !== (p.brand || null)) data.brand = f.brand || null;
        data.compatibleModels = f.compatibleModels;
        if (f.new_slug && f.new_slug !== p.slug) {
          data.slug = f.new_slug;
          redirectFrom = p.slug;
        }
      }
    }
    const compat = data.compatibleModels || p.compatibleModels || [];
    data.modelSlugs = modelSlugsFor(compat);
    if (descById.has(p.id)) {
      const then = snapshot?.get(p.id);
      if (then && editedSince(p.desc, then.desc, descById.get(p.id))) kept.push('description');
      else data.desc = descById.get(p.id);
    }
    const unpublish = (f && f.status === 'unpublish') || Boolean(findDisabledCategory(p.categories || p.category));
    if (unpublish && p.published) data.published = false;
    plans.push({ id: p.id, before: p, data, redirectFrom, unpublish: unpublish && p.published, kept });
  }
  return plans;
}

// New products: matched by SKU and slug, so a re-run creates nothing twice.
export function planNew(newProducts, dbProducts) {
  const skus = new Set(dbProducts.map((p) => p.sku).filter(Boolean));
  const slugs = new Set(dbProducts.map((p) => p.slug).filter(Boolean));
  const create = [];
  let alreadyThere = 0;
  for (const n of newProducts) {
    if (skus.has(n.sku) || slugs.has(n.slug)) {
      alreadyThere++;
      continue;
    }
    create.push(n);
  }
  return { create, alreadyThere };
}

export function toCreateData(n, { publish = true } = {}) {
  const shown = publish && n.priceStatus === 'published' && n.price > 0;
  return {
    slug: n.slug,
    name: n.name,
    desc: n.desc || n.name,
    categories: n.categories,
    category: n.category,
    images: n.images || [],
    img: n.img || '',
    price: shown ? n.price : 0,
    priceStatus: shown ? 'published' : 'draft',
    qualityOptions: shown ? normalizeQualityOptions(n.qualityOptions) : [],
    draftPrice: n.draftPrice,
    referencePrice: n.referencePrice,
    priceNote: n.priceNote,
    stock: n.stock || 0,
    readyToSell: false,
    sku: n.sku,
    brand: n.brand,
    compatibleModels: n.compatibleModels,
    modelSlugs: n.modelSlugs?.length ? n.modelSlugs : modelSlugsFor(n.compatibleModels),
    moq: n.moq || 1,
    warranty: n.warranty || '7 Days Testing Warranty',
    published: n.published !== false,
    bulkPricing: [],
  };
}

// New products created by an earlier run, before they had grade prices, and
// still exactly as that run left them (price hidden, no grades, no price
// typed by the owner): they get their grades now.
export function planGradeUpdates(newProducts, dbProducts, { publish = true } = {}) {
  if (!publish) return [];
  const bySku = new Map(dbProducts.filter((p) => p.sku).map((p) => [p.sku, p]));
  const out = [];
  for (const n of newProducts) {
    const grades = normalizeQualityOptions(n.qualityOptions);
    const p = bySku.get(n.sku);
    if (!grades.length || !p || p.priceStatus === 'published' || hasQualityOptions(p) || p.price > 0) continue;
    out.push({ id: p.id, name: p.name, data: { qualityOptions: grades, price: grades[0].price, priceStatus: 'published' } });
  }
  return out;
}

// Products added in admin after 11 Oct (not in the import files) that were
// priced there before this upgrade: the deploy hid that price (every product
// starts as "draft"), so the import shows it again. `deployedAt` = when the
// hidden-price migration ran; a product touched since then (e.g. "দাম লুকাও"
// in admin) is left alone, and so is a hidden (unpublished) product.
export function planOldAdminPrices(dbProducts, { drafts = [], newProducts = [], deployedAt = null, publish = true } = {}) {
  if (!publish || !deployedAt) return [];
  const inFiles = new Set(drafts.map((d) => d.id));
  const ours = new Set(newProducts.map((n) => n.sku).filter(Boolean));
  return dbProducts.filter((p) => !inFiles.has(p.id) && !ours.has(p.sku) && p.published !== false
    && p.price > 0 && p.priceStatus !== 'published' && p.draftPrice == null
    && new Date(p.updatedAt) <= new Date(deployedAt)
    && !findDisabledCategory(p.categories || p.category));
}

// Corrections found after the import (owner, 12 Oct 2026: "fix prices that
// look wrong"): unpublish a product that isn't a real phone, or hide a price
// whose market data can't be right. Each applies only while the product is
// still as the import left it (same name / same price), so an owner's fix
// made later is never undone.
export function planCorrections(corrections, dbProducts) {
  const bySku = new Map(dbProducts.filter((p) => p.sku).map((p) => [p.sku, p]));
  const out = [];
  for (const c of corrections || []) {
    const p = bySku.get(c.sku);
    if (!p || (c.name && p.name !== c.name)) continue;
    if (c.action === 'unpublish' && p.published) {
      out.push({ id: p.id, name: p.name, reason: c.reason, data: { published: false } });
    } else if (c.action === 'hide-price' && p.priceStatus === 'published' && Number(p.price) === Number(c.expectPrice)) {
      out.push({ id: p.id, name: p.name, reason: c.reason, data: { priceStatus: 'draft', price: 0, qualityOptions: [], priceNote: `${c.reason} — set the price yourself` } });
    }
  }
  return out;
}

// Products the shop doesn't sell (switched-off categories such as Upper
// Glass, or parts such as Camera Glass) that are still published: hidden
// (published: false — reversible, nothing is deleted).
export function planSwitchedOff(dbProducts) {
  return dbProducts
    .filter((p) => p.published && (findDisabledCategory(p.categories || p.category) || isDisabledPartName(p.name)))
    .map((p) => ({ id: p.id, name: p.name, data: { published: false } }));
}

// ---------- Owner, 12 Oct 2026: show the hidden prices ----------
// Cheap parts (the rule's cut would leave < 50% of the market price, the old
// "SET MANUALLY" rows): market price − 20%, rounded to end in 9 — same as
// noyon-telecom-kit/scripts/pricing_rule.py's cheap_price().
export function cheapPartPrice(marketPrice) {
  return Math.round((Number(marketPrice) * 0.8) / 10) * 10 - 1;
}

// Which hidden prices go live: the cheap parts, the owner's own price kept
// hidden on 11 Oct (unclear name), and the rule's suggested price — unless
// the market listed two prices far apart (two grades/versions?) or the data
// was wrong ("set the price yourself"). Those stay hidden for the owner.
const CLOSE_OPTIONS = 1.15;

export function planHiddenPrices(products) {
  const plan = { cheap: [], ownerKept: [], suggested: [], keptHidden: [], noPrice: [] };
  for (const p of products) {
    if (!p.published || p.priceStatus === 'published') continue;
    if (findDisabledCategory(p.categories || p.category) || isDisabledPartName(p.name)) continue;
    const note = String(p.priceNote || '');
    const draft = Number(p.draftPrice) || 0;
    const market = Number(p.referencePrice) || 0;
    if (!draft && !(Number(p.price) > 0) && /SET MANUALLY/.test(note) && market >= 50 && market < 400) {
      const price = cheapPartPrice(market);
      plan.cheap.push({ p, price, note: note.replace(/ — SET MANUALLY: the rule gives too low a price/, ` → cheap part −20%: ${price}`) });
    } else if (draft > 0 && /set the price yourself/.test(note)) {
      plan.keptHidden.push({ p, reason: 'market data wrong' });
    } else if (draft > 0 && /^kept the current price/.test(note)) {
      plan.ownerKept.push({ p, price: draft, note });
    } else if (draft > 0) {
      const options = [...note.matchAll(/(\d+) -> \d+/g)].map((m) => Number(m[1]));
      if (options.length >= 2 && Math.max(...options) > Math.min(...options) * CLOSE_OPTIONS) {
        plan.keptHidden.push({ p, reason: `market prices ${Math.min(...options)}–${Math.max(...options)}` });
      } else {
        plan.suggested.push({ p, price: draft, note });
      }
    } else {
      plan.noPrice.push({ p });
    }
  }
  return plan;
}

// ---------- The owner's own price list (e.g. iPhone back glass, 12 Oct 2026) ----------
// Each listed product gets exactly the owner's grades (cheapest first; the
// price is the cheapest) and goes live. With hideOthersInScope, the other
// products of the same brand + category lose their old (market-rule) price:
// they go back to "price on WhatsApp" until the owner prices them.
export function planOwnerPrices(products, list) {
  const scope = list.scope || {};
  const inScope = (p) => p.published
    && (!scope.brand || p.brand === scope.brand)
    && (!scope.category || p.category === scope.category);
  const byName = new Map(products.map((p) => [String(p.name).trim().toLowerCase(), p]));
  const set = [];
  const unmatched = [];
  for (const entry of list.prices || []) {
    const p = byName.get(String(entry.name).trim().toLowerCase());
    const grades = normalizeQualityOptions(entry.grades);
    if (!p || !grades.length) { unmatched.push(entry.name); continue; }
    set.push({ p, grades, price: grades[0].price });
  }
  const listed = new Set(set.map((x) => x.p.id));
  const hide = list.hideOthersInScope
    ? products.filter((p) => inScope(p) && !listed.has(p.id) && p.priceStatus === 'published')
    : [];
  return { set, hide, unmatched };
}
