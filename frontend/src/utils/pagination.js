// Windowed pagination for the Shop page's page-number strip. At a 10,000+
// product catalog with e.g. 12 items/page, totalPages can run into the
// hundreds — rendering one button per page would break the layout (and
// balloon the DOM). This shows first, last, current ±`delta`, and a single
// '…' for any gap, so the strip stays a fixed, small size regardless of
// how large the catalog grows.
export function buildPageWindow(page, totalPages, delta = 1) {
  const items = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      items.push(i);
    } else if (items[items.length - 1] !== '…') {
      items.push('…');
    }
  }
  return items;
}
