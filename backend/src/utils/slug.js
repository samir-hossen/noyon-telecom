// Mirrors frontend/src/utils/slug.js exactly — kept in sync by hand since
// the two are separate deployable packages with no shared import between
// them.
export function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  );
}

// A product's real, stored `slug` column is what's actually used to look it
// up (falls back to the raw id for a row that hasn't been backfilled yet —
// see backfillProductSlugs.js) — /api/products/:id resolves either one via
// an OR query, so this never produces a link that 404s.
export function productPath(product) {
  return `/product/${product.slug || product.id}`;
}

// Backend-only (no frontend equivalent needed): picks a slug guaranteed not
// to collide with anything in `existingSlugs`, for a one-pass bulk backfill
// where checking each candidate against the DB in a loop would mean one
// query per row. The caller adds each returned slug to the set before
// generating the next one.
export function uniqueSlugFromSet(name, existingSlugs) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

// Backend-only: same idea as uniqueSlugFromSet, but for a single admin
// create/update request, where checking straight against the live DB (via
// Prisma) is simpler than assembling a full existing-slugs set for one row.
// `excludeId` lets an update check for collisions without tripping over the
// row's own already-assigned slug.
export async function assignUniqueSlug(prisma, name, excludeId) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (true) {
    const clash = await prisma.product.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${n++}`;
  }
}
