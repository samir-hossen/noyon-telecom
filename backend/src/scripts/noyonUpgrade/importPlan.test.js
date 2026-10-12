import test from 'node:test';
import assert from 'node:assert/strict';
import { editedSince, planExisting, planNew, planOldAdminPrices, planGradeUpdates, planCorrections, planSwitchedOff, toCreateData, cheapPartPrice, planHiddenPrices, planOwnerPrices } from './importPlan.js';

// One product as it was on 11 Oct, with its rows from the import files.
const before = {
  id: 'p1', name: 'A60 Display', brand: 'itel', slug: 'a60-display', price: 880, priceStatus: 'draft',
  desc: 'Old text.', categories: ['Display'], category: 'Display', compatibleModels: ['A60'], published: true,
};
const draft = { id: 'p1', currentPrice: 880, draftPrice: 850, referencePrice: 1050, priceNote: 'rule', publishPrice: 880 };
const fix = {
  id: 'p1', status: 'auto-fix', old_name: 'A60 Display', new_name: 'Itel A60 Display', old_brand: 'itel', brand: 'Itel',
  new_slug: 'itel-a60-display', compatibleModels: ['Itel A60'],
};
const files = {
  drafts: [draft],
  fixes: [fix],
  descriptions: [{ id: 'p1', desc: 'New English text.' }],
  snapshot: new Map([['p1', before]]),
};

function plan(now, opts = {}) {
  return planExisting([{ ...before, ...now }], { ...files, ...opts })[0];
}

test('editedSince: only a value that is neither the old one nor ours', () => {
  assert.equal(editedSince(880, 880, 900), false);
  assert.equal(editedSince(900, 880, 900), false);
  assert.equal(editedSince(950, 880, 900), true);
  assert.equal(editedSince(null, undefined, 5), false);
});

test('untouched product gets the planned price, name, slug and description', () => {
  const x = plan({});
  assert.deepEqual(x.kept, []);
  assert.equal(x.data.price, 880);
  assert.equal(x.data.priceStatus, 'published');
  assert.equal(x.data.name, 'Itel A60 Display');
  assert.equal(x.data.brand, 'Itel');
  assert.equal(x.data.slug, 'itel-a60-display');
  assert.equal(x.redirectFrom, 'a60-display');
  assert.equal(x.data.desc, 'New English text.');
  assert.equal(x.data.draftPrice, 850);
});

test('a price changed in admin after 11 Oct is kept and shown', () => {
  const x = plan({ price: 990 });
  assert.deepEqual(x.kept, ['price']);
  assert.equal('price' in x.data, false);
  assert.equal(x.data.priceStatus, 'published');
});

test('a price cleared in admin after 11 Oct stays hidden', () => {
  const x = plan({ price: 0 });
  assert.deepEqual(x.kept, ['price']);
  assert.equal('price' in x.data, false);
  assert.equal(x.data.priceStatus, 'draft');
});

test('a name or brand changed in admin after 11 Oct is kept — no rename, no new slug', () => {
  for (const now of [{ name: 'Itel A60s Display' }, { brand: 'Tecno' }]) {
    const x = plan(now);
    assert.deepEqual(x.kept, ['name']);
    assert.equal('name' in x.data, false);
    assert.equal('slug' in x.data, false);
    assert.equal(x.redirectFrom, null);
  }
});

test('a description changed in admin after 11 Oct is kept', () => {
  const x = plan({ desc: 'Owner wrote this.' });
  assert.deepEqual(x.kept, ['description']);
  assert.equal('desc' in x.data, false);
});

test('re-running after the import changes nothing and keeps nothing', () => {
  const x = plan({ name: 'Itel A60 Display', brand: 'Itel', slug: 'itel-a60-display', desc: 'New English text.', price: 880, priceStatus: 'published' });
  assert.deepEqual(x.kept, []);
  assert.equal('name' in x.data, false);
  assert.equal(x.redirectFrom, null);
  assert.equal(x.data.priceStatus, 'published');
});

test('a price the rule set (no 11 Oct price) is not mistaken for an owner edit on a re-run', () => {
  const ruleDraft = { ...draft, currentPrice: null, publishPrice: 850 };
  const x = planExisting([{ ...before, price: 850 }], { ...files, drafts: [ruleDraft] })[0];
  assert.deepEqual(x.kept, []);
  assert.equal(x.data.price, 850);
});

test('a price the builder judged unreliable stays hidden (and is not changed)', () => {
  const x = planExisting([before], { ...files, drafts: [{ ...draft, publishPrice: null }] })[0];
  assert.equal(x.data.priceStatus, 'draft');
  assert.equal('price' in x.data, false);
});

test('--no-publish hides every price, even one typed after 11 Oct', () => {
  assert.equal(plan({}, { publish: false }).data.priceStatus, 'draft');
  assert.equal(plan({ price: 990 }, { publish: false }).data.priceStatus, 'draft');
});

test('battery products and the test product are unpublished', () => {
  const battery = planExisting([{ ...before, categories: ['Battery'], category: 'Battery' }], files)[0];
  assert.equal(battery.data.published, false);
  const testProduct = planExisting([before], { ...files, fixes: [{ id: 'p1', status: 'unpublish' }] })[0];
  assert.equal(testProduct.data.published, false);
});

test('new products: matched by SKU or slug, so nothing is created twice', () => {
  const { create, alreadyThere } = planNew(
    [{ sku: 'NT-DIS-ITEL-A70', slug: 'itel-a70-display' }, { sku: 'NT-DIS-ITEL-A60', slug: 'x' }, { sku: 'y', slug: 'a60-display' }],
    [{ ...before, sku: 'NT-DIS-ITEL-A60' }]
  );
  assert.deepEqual(create.map((n) => n.sku), ['NT-DIS-ITEL-A70']);
  assert.equal(alreadyThere, 2);
});

test('new products: a price is written only when it is shown', () => {
  const n = { slug: 's', name: 'Itel A70 Display', sku: 'k', compatibleModels: ['Itel A70'], priceStatus: 'published', price: 950, draftPrice: 950 };
  assert.deepEqual([toCreateData(n).price, toCreateData(n).priceStatus], [950, 'published']);
  assert.deepEqual([toCreateData(n, { publish: false }).price, toCreateData(n, { publish: false }).priceStatus], [0, 'draft']);
  assert.deepEqual([toCreateData({ ...n, priceStatus: 'draft', price: null }).price, toCreateData({ ...n, priceStatus: 'draft', price: null }).priceStatus], [0, 'draft']);
});

test('a product added and priced in the old admin gets its price shown again; one hidden after the deploy does not', () => {
  const deployedAt = '2026-10-20T10:00:00Z';
  const added = { id: 'p9', sku: 'S9', name: 'Tecno Spark 10 Display', price: 700, priceStatus: 'draft', draftPrice: null, categories: ['Display'], updatedAt: '2026-10-15T09:00:00Z' };
  const opts = { drafts: [draft], newProducts: [{ sku: 'NT-1' }], deployedAt };
  assert.deepEqual(planOldAdminPrices([added], opts).map((p) => p.id), ['p9']);
  assert.deepEqual(planOldAdminPrices([{ ...added, updatedAt: '2026-10-21T09:00:00Z' }], opts), []); // "দাম লুকাও" after the deploy
  assert.deepEqual(planOldAdminPrices([{ ...before, updatedAt: '2026-10-15T09:00:00Z' }], opts), []); // in the import files
  assert.deepEqual(planOldAdminPrices([{ ...added, price: 0 }], opts), []);
  assert.deepEqual(planOldAdminPrices([{ ...added, categories: ['Battery'] }], opts), []);
  assert.deepEqual(planOldAdminPrices([{ ...added, published: false }], opts), []); // hidden test product
  assert.deepEqual(planOldAdminPrices([added], { ...opts, deployedAt: null }), []);
  assert.deepEqual(planOldAdminPrices([added], { ...opts, publish: false }), []);
});

test('grades: an existing product priced per grade gets its grades', () => {
  const graded = { ...draft, currentPrice: null, publishPrice: 999, publishOptions: [{ label: 'Original', price: 1699 }, { label: 'High Quality', price: 999 }] };
  const x = planExisting([{ ...before, price: 0 }], { ...files, drafts: [graded] })[0];
  assert.equal(x.data.price, 999);
  assert.equal(x.data.priceStatus, 'published');
  assert.deepEqual(x.data.qualityOptions, [{ label: 'High Quality', price: 999 }, { label: 'Original', price: 1699 }]);
});

test('grades: new products are created with them only when the price is shown', () => {
  const n = { slug: 's', name: 'iPhone 6 Display', sku: 'k', compatibleModels: ['iPhone 6'], priceStatus: 'published', price: 1149,
    qualityOptions: [{ label: 'Original', price: 1999 }, { label: 'High Quality', price: 1149 }] };
  assert.deepEqual(toCreateData(n).qualityOptions, [{ label: 'High Quality', price: 1149 }, { label: 'Original', price: 1999 }]);
  assert.deepEqual(toCreateData(n, { publish: false }).qualityOptions, []);
});

test('grades: products an earlier run created get them only if still untouched', () => {
  const grades = [{ label: 'High Quality', price: 1149 }, { label: 'Original', price: 1999 }];
  const newProducts = [{ sku: 'A', qualityOptions: grades }, { sku: 'B', qualityOptions: grades }, { sku: 'C', qualityOptions: grades },
    { sku: 'D', qualityOptions: grades }, { sku: 'E', qualityOptions: [] }];
  const db = [
    { id: 'a', sku: 'A', name: 'a', price: 0, priceStatus: 'draft', qualityOptions: [] }, // untouched -> graded
    { id: 'b', sku: 'B', name: 'b', price: 1300, priceStatus: 'published', qualityOptions: [] }, // owner priced it
    { id: 'c', sku: 'C', name: 'c', price: 1300, priceStatus: 'draft', qualityOptions: [] }, // owner typed then hid it
    { id: 'd', sku: 'D', name: 'd', price: 1149, priceStatus: 'published', qualityOptions: grades }, // already done
    { id: 'e', sku: 'E', name: 'e', price: 0, priceStatus: 'draft', qualityOptions: [] }, // no grades to add
  ];
  const plan = planGradeUpdates(newProducts, db);
  assert.deepEqual(plan.map((g) => g.id), ['a']);
  assert.deepEqual(plan[0].data, { qualityOptions: grades, price: 1149, priceStatus: 'published' });
  assert.deepEqual(planGradeUpdates(newProducts, db, { publish: false }), []);
});

test('corrections apply only while the product is still as imported', () => {
  const corrections = [
    { sku: 'DUO', name: 'iPhone Duo Display', action: 'unpublish', reason: 'not a real phone' },
    { sku: 'FOLD', name: 'Pixel Fold Display', action: 'hide-price', expectPrice: 3629, reason: 'grades wrong' },
  ];
  const db = [
    { id: 'd', sku: 'DUO', name: 'iPhone Duo Display', published: true, priceStatus: 'published', price: 77299 },
    { id: 'f', sku: 'FOLD', name: 'Pixel Fold Display', published: true, priceStatus: 'published', price: 3629, qualityOptions: [{ label: 'Original', price: 3629 }] },
  ];
  const plan = planCorrections(corrections, db);
  assert.deepEqual(plan.map((x) => [x.id, x.data.published ?? x.data.priceStatus]), [['d', false], ['f', 'draft']]);
  assert.deepEqual(plan[1].data.qualityOptions, []);
  // the owner already fixed them: nothing to do
  assert.deepEqual(planCorrections(corrections, [
    { ...db[0], name: 'Surface Duo Display' },
    { ...db[1], price: 18500 },
  ]), []);
  assert.deepEqual(planCorrections(corrections, [{ ...db[0], published: false }]), []);
});

test('products the shop does not sell are switched off (Upper Glass, Camera Glass, Battery)', () => {
  const db = [
    { id: 'u', name: 'Vivo Y21 Display Upper Glass', categories: ['Upper Glass'], published: true },
    { id: 'c', name: 'Vivo Y21 Camera Glass', categories: ['Camera'], published: true },
    { id: 'b', name: 'Vivo Y21 Back Glass', categories: ['Back Glass'], published: true },
    { id: 'k', name: 'Vivo Y21 Back Camera', categories: ['Camera'], published: true },
    { id: 'x', name: 'Old Camera Glass', categories: ['Camera'], published: false },
  ];
  assert.deepEqual(planSwitchedOff(db).map((p) => p.id), ['u', 'c']);
});

test('cheapPartPrice: market − 20%, ending in 9 (same as pricing_rule.py)', () => {
  assert.equal(cheapPartPrice(199), 159);
  assert.equal(cheapPartPrice(299), 239);
  assert.equal(cheapPartPrice(349), 279);
  assert.equal(cheapPartPrice(279), 219);
  assert.equal(cheapPartPrice(79), 59);
});

test('planHiddenPrices: cheap parts, owner prices and close market prices go live; the rest stay hidden', () => {
  const base = { published: true, priceStatus: 'draft', price: 0, category: 'Speaker', categories: ['Speaker'] };
  const rows = [
    { ...base, name: 'Vivo Y72 Ear Speaker', referencePrice: 199, priceNote: 'market 199 [(single option)] — SET MANUALLY: the rule gives too low a price · owner-rule-2026-10' },
    { ...base, name: 'A15 Display', category: 'Display', categories: ['Display'], draftPrice: 880, priceNote: 'kept the current price ৳880 as the draft (no usable market match — brand unclear) · owner-rule-2026-10' },
    { ...base, name: 'Huawei Y7 (2019) Display', draftPrice: 1199, priceNote: 'etel 1399 [(single option)] <2,000 -200 · owner-rule-2026-10 · all options: (single option) 1399 -> 1199 | (single option) 1449 -> 1249' },
    { ...base, name: 'Google Pixel 6 Pro Back Glass', draftPrice: 1399, priceNote: 'etel 1599 · all options: (single option) 5499 -> 5039 | (single option) 1599 -> 1399' },
    { ...base, name: 'Huawei Pura 80 Pro Display', draftPrice: 1099, priceNote: "market grades can't be right (Original ৳1,099 < High Quality ৳7,299) — set the price yourself" },
    { ...base, name: 'Samsung Galaxy J7 Duo (J720) Display', draftPrice: 2499, priceNote: 'etel 2799 [(single option)] 2,000-2,999 -300 · owner-rule-2026-10' },
    { ...base, name: 'Asus Zenfone 11 Ultra Display', referencePrice: 1, priceNote: 'market shows no price (call for price) · owner-rule-2026-10' },
    { ...base, name: 'Oppo A57s Camera Glass', referencePrice: 199, priceNote: 'SET MANUALLY' },
    { ...base, name: 'Already Shown', priceStatus: 'published', price: 500 },
  ];
  const plan = planHiddenPrices(rows);
  assert.deepEqual(plan.cheap.map((x) => [x.p.name, x.price]), [['Vivo Y72 Ear Speaker', 159]]);
  assert.match(plan.cheap[0].note, /→ cheap part −20%: 159/);
  assert.deepEqual(plan.ownerKept.map((x) => x.p.name), ['A15 Display']);
  assert.deepEqual(plan.suggested.map((x) => x.p.name), ['Huawei Y7 (2019) Display', 'Samsung Galaxy J7 Duo (J720) Display']);
  assert.deepEqual(plan.keptHidden.map((x) => x.p.name), ['Google Pixel 6 Pro Back Glass', 'Huawei Pura 80 Pro Display']);
  assert.deepEqual(plan.noPrice.map((x) => x.p.name), ['Asus Zenfone 11 Ultra Display']);
});

test("planOwnerPrices: the owner's grades go live; other prices in the same brand + category are hidden", () => {
  const base = { published: true, brand: 'Apple', category: 'Back Glass', priceStatus: 'published', price: 1599 };
  const products = [
    { ...base, id: '1', name: 'iPhone 15 Back Glass' },
    { ...base, id: '2', name: 'iPhone 8 Back Glass' },
    { ...base, id: '3', name: 'iPhone 7 Back Glass' },
    { ...base, id: '4', name: 'iPhone SE Back Glass', priceStatus: 'draft' },
    { ...base, id: '5', name: 'iPhone 15 Display', category: 'Display' },
  ];
  const plan = planOwnerPrices(products, {
    scope: { brand: 'Apple', category: 'Back Glass' },
    hideOthersInScope: true,
    prices: [
      { name: 'iPhone 15 Back Glass', grades: [{ label: 'Original', price: 1499 }, { label: 'Market Quality', price: 450 }] },
      { name: 'iPhone 8 back glass', grades: [{ label: 'Market Quality', price: 180 }] },
      { name: 'iPhone 99 Back Glass', grades: [{ label: 'Original', price: 999 }] },
    ],
  });
  assert.deepEqual(plan.set.map((x) => [x.p.id, x.price, x.grades.map((g) => g.label)]), [['1', 450, ['Market Quality', 'Original']], ['2', 180, ['Market Quality']]]);
  assert.deepEqual(plan.hide.map((p) => p.id), ['3']);
  assert.deepEqual(plan.unmatched, ['iPhone 99 Back Glass']);
});
