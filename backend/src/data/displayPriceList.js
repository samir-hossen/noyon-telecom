// Real "Display" category wholesale price list, as given by the shop owner
// (Noyon Telecom) on 2026-08-02. Prices are in BDT.
//
// Source format was a raw list like "Y20- y52s=790" (one physical display
// part that fits both the Y20 and Y52s) — parsed into structured rows below.
// Model codes are kept EXACTLY as given (not auto-corrected to a guessed
// full name) because guessing wrong (e.g. "Not 7" -> "Note 7" for the wrong
// brand) is worse than an admin fixing a raw code by eye. `compatibleModels`
// splits ranges like "C11-A16" into ["C11", "A16"] so both are searchable.
//
// IMPORTANT — review before going live:
// - `brand` is intentionally left blank for ambiguous codes rather than
//   guessed, so nothing gets mis-tagged under the wrong phone brand.
// - `img`/`images` point at a shared neutral placeholder — swap for real
//   product photos via the Admin panel before launch.
// - `stock` defaults to 50 for every row since the price list didn't include
//   quantities — correct this per-item in Admin once you know real counts.
export const DISPLAY_PRICE_LIST = [
  { models: ['Y20', 'Y52s'], price: 790 },
  { models: ['C11', 'A16'], price: 770 },
  { models: ['A13', 'A23'], price: 900 },
  { models: ['KG5'], price: 830 },
  { models: ['Smart 9'], price: 880 },
  { models: ['X6515'], price: 830 },
  { models: ['X688'], price: 840 },
  { models: ['A12'], price: 800 },
  { models: ['A02s'], price: 800 },
  { models: ['Not 7'], price: 790 },
  { models: ['8A'], price: 800 },
  { models: ['9A'], price: 790 },
  { models: ['Radme 9'], price: 800 },
  { models: ['Realme 6'], price: 900 },
  { models: ['13 C'], price: 860 },
  { models: ['C20'], price: 800 },
  { models: ['Y03'], price: 850 },
  { models: ['Y30'], price: 850 },
  { models: ['A57'], price: 810 },
  { models: ['A1k'], price: 800 },
  { models: ['A3S'], price: 800 },
  { models: ['A13 5G'], price: 850 },
  { models: ['A11'], price: 870 },
  { models: ['A21s'], price: 900 },
  { models: ['J710'], price: 770 },
  { models: ['J720'], price: 770 },
  { models: ['J4'], price: 770 },
  { models: ['A30s'], price: 850 },
  { models: ['A10'], price: 790 },
  { models: ['Smart 8'], price: 830 },
  { models: ['KE5'], price: 790 },
  { models: ['LC7'], price: 900 },
];
