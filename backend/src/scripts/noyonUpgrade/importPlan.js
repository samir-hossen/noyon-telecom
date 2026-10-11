// What applyImport.js changes, as pure functions (no database), so the rules
// are unit-tested (importPlan.test.js).
//
// The import files were built from the catalog as it was on 11 Oct 2026. The
// owner may keep working in admin until the import runs: a price, name, brand
// or description that is neither the 11 Oct value nor ours was changed there,
// and the owner's value is kept.
import { modelSlugsFor } from '../../utils/modelSlugs.js';
import { findDisabledCategory } from '../../config/catalog.js';

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
