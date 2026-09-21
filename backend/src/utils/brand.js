// Detects a known phone brand from a product's own name/description text —
// e.g. "Samsung Galaxy A12 Display" -> "Samsung", "iPhone 13 OLED Display" ->
// "Apple". This only ever matches a brand word that's *already written* in
// the text; it never guesses a brand for a bare model code like "Y20" or
// "A16" that could belong to several brands (see data/displayPriceList.js's
// own comment on why guessing wrong there is worse than leaving it blank).
const KNOWN_BRANDS = [
  'Samsung', 'Apple', 'iPhone', 'Xiaomi', 'Redmi', 'Poco', 'Vivo', 'Oppo', 'Realme',
  'Infinix', 'Tecno', 'itel', 'Symphony', 'Walton', 'Nokia', 'Honor', 'Huawei',
  'OnePlus', 'Motorola', 'Google', 'Pixel', 'Sony', 'LG', 'Asus', 'Lenovo', 'ZTE',
  'Lava', 'Micromax',
];

// Sub-brand/product-line words that aren't the actual schema.org brand name
// themselves — an "iPhone" product is really made by Apple, a "Redmi"/"Poco"
// one by Xiaomi, a "Pixel" one by Google.
const BRAND_ALIASES = {
  iphone: 'Apple',
  redmi: 'Xiaomi',
  poco: 'Xiaomi',
  pixel: 'Google',
};

export function detectBrandFromText(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    const needle = brand.toLowerCase();
    // Word-boundary match so e.g. "Lava" doesn't false-match inside an
    // unrelated longer word.
    if (new RegExp(`\\b${needle}\\b`).test(lower)) {
      return BRAND_ALIASES[needle] || brand;
    }
  }
  return null;
}
