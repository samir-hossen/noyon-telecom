# Price/Catalog Import Summary — 2026-08-02

## 1. Display prices — LIVE, ready to publish
32 products imported by `npm run import:display-prices` (in
`backend/src/data/displayPriceList.js`), all with real prices you provided
(৳770–৳900). These import as **published: true** — visible on the
storefront as soon as you run the script and set a real photo (they use a
shared placeholder image right now).

**Still needed per item:** a real photo, and a real stock count (defaults to 50).

# Price/Catalog Import Summary — 2026-08-02 (updated)

**Owner decision:** publish everything now, even without final prices —
unpriced items show ৳0 and get corrected later via Admin.

## 1. Display prices — LIVE
32 products, real prices (৳770–৳900), `npm run import:display-prices`.

## 2. C/C Flex — 311 products — LIVE at ৳0
## 3. SIM Tray — 96 products — LIVE at ৳0
Both `npm run import:compatibility-lists`. Visible on the storefront
showing ৳0 until priced. **Not purchasable** in the meantime — stock is 0
on every one of these, and checkout blocks any order that exceeds
available stock (see `backend/src/routes/orders.routes.js`), so a ৳0 price
can't turn into a free real order.

If you already ran an earlier version of this script (when it created
hidden drafts), you don't need to re-import — just run:
```
npm run publish:all-drafts
```
This flips any already-imported draft to published in one step.

## To price an item later
Admin → Products → search by model or SKU (e.g. `NT-CCFLEX-SAMSUNG-...`)
→ Edit → set price, stock, photo → Save. Setting a real stock count is
what actually makes it purchasable — the ৳0 price alone won't.

## Re-running the import scripts
Safe to re-run anytime after editing the data files — they update
existing rows by SKU (description, compatible-models, published state)
without duplicating, and never overwrite a price/stock/photo you've
already set by hand in Admin.

