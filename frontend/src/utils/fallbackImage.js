// Small inline SVG placeholder shown via onError when a product photo
// 404s or the CDN path is broken, and by resolveImg() (see api.js) whenever
// a product's img field is empty — no data-URI/copyright concerns since
// this is drawn from scratch, not sourced from the web, and no network
// request is involved either way. The "Photo coming soon" label makes the
// empty-field case (a product that genuinely has no photo yet) read as
// intentional/temporary rather than looking like a broken page.
export const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f6f6f8'/%3E%3Cg fill='none' stroke='%23c7c9cf' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='150' y='70' width='100' height='180' rx='16'/%3E%3Cline x1='180' y1='105' x2='220' y2='105'/%3E%3Ccircle cx='200' cy='225' r='12'/%3E%3C/g%3E%3Ctext x='200' y='288' font-family='Arial, sans-serif' font-size='22' fill='%239a9ea6' text-anchor='middle'%3EPhoto coming soon%3C/text%3E%3C/svg%3E";
