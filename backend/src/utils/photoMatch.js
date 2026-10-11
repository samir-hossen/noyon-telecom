// Bulk photo upload: which product a photo belongs to, from its file name.
//   NT-DIS-SAMSUNG-GALAXY-A15.jpg            -> SKU, main photo
//   samsung-galaxy-a15-display.jpg           -> product link (slug), main photo
//   NT-DIS-SAMSUNG-GALAXY-A15-2.jpg / "... (2).jpg" -> extra photo of the same product
// The whole name is tried first: some SKUs/slugs end in "-2" themselves (and
// model names in numbers, e.g. "...-iphone-11").
export function photoKeys(filename) {
  const base = String(filename || '').replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  const exact = base.toLowerCase().replace(/[\s_]+/g, '-');
  const m = base.match(/^(.+?)(?:\s*\((\d{1,2})\)|[-_ ](\d{1,2}))$/);
  const stripped = m ? m[1].trim().toLowerCase().replace(/[\s_]+/g, '-') : null;
  return { exact, stripped, index: m ? Number(m[2] || m[3]) : 1 };
}

const MAX_IMAGES = 8;

// The product's photos after adding `url`: a main photo goes first, an extra
// one ("-2") after the others; placeholders are never kept; at most 8.
export function withPhoto(images, url, { extra = false } = {}) {
  const real = (Array.isArray(images) ? images : []).filter((src) => src && !src.startsWith('/images/placeholders/') && !src.startsWith('/images/parts/') && src !== url);
  const next = extra ? [...real, url] : [url, ...real];
  return next.slice(0, MAX_IMAGES);
}
