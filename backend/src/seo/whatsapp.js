// Same number and pre-filled Bangla message as the storefront's
// frontend/src/utils/whatsapp.js (owner's wording, see CLAUDE.md).
export const WHATSAPP_NUMBER = '8801560047377';

export function priceRequestMessage({ name, sku, url }) {
  return `আসসালামু আলাইকুম, এই পার্টসটার পাইকারি দাম জানতে চাই: ${name}${sku ? ` (SKU: ${sku})` : ''} — ${url}`;
}
