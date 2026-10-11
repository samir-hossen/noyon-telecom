import test from 'node:test';
import assert from 'node:assert/strict';
import { DISABLED_CATEGORIES, ACTIVE_CATEGORIES, isDisabledCategory, findDisabledCategory, disabledCategoryError, notInDisabledCategories, isDisabledPartName } from './catalog.js';
import { buildProductWhere } from '../utils/productQuery.js';

test('battery section is OFF', async (t) => {
  await t.test('Battery and Upper Glass are switched off and not active', () => {
    assert.deepEqual(DISABLED_CATEGORIES, ['Battery', 'Upper Glass']);
    assert.equal(ACTIVE_CATEGORIES.includes('Battery'), false);
    assert.equal(ACTIVE_CATEGORIES.includes('Upper Glass'), false);
    assert.equal(ACTIVE_CATEGORIES.includes('Back Glass'), true);
    assert.equal(ACTIVE_CATEGORIES.includes('Display'), true);
  });

  await t.test('matching ignores case and spacing', () => {
    assert.equal(isDisabledCategory('battery'), true);
    assert.equal(isDisabledCategory(' Battery '), true);
    assert.equal(isDisabledCategory('Display'), false);
    assert.equal(findDisabledCategory(['Display', 'Battery']), 'Battery');
    assert.equal(findDisabledCategory('Battery'), 'Battery');
    assert.equal(findDisabledCategory(['Charging Port', 'Flex']), null);
  });

  await t.test('admin error is in Bangla', () => {
    assert.match(disabledCategoryError('Battery'), /ব্যাটারি সেকশন এখন বন্ধ/);
    assert.match(disabledCategoryError('Upper Glass'), /আপার গ্লাস সেকশন এখন বন্ধ/);
  });

  await t.test('storefront listing queries exclude it; admin queries do not', () => {
    const storefront = buildProductWhere({ status: 'published', storefront: true });
    assert.deepEqual(storefront.AND, notInDisabledCategories());
    assert.deepEqual(storefront.AND, [{ NOT: { categories: { array_contains: 'Battery' } } }, { NOT: { categories: { array_contains: 'Upper Glass' } } }]);
    assert.equal('AND' in buildProductWhere({ status: 'all' }), false);
  });

  await t.test('search words and the category exclusion combine', () => {
    const where = buildProductWhere({ status: 'published', storefront: true, search: 'vivo y21' });
    assert.equal(where.AND.length, 4); // two words + two switched-off categories
    assert.deepEqual(where.AND.slice(2), [{ NOT: { categories: { array_contains: 'Battery' } } }, { NOT: { categories: { array_contains: 'Upper Glass' } } }]);
  });
});

test('glass the shop does not sell: camera glass parts', () => {
  assert.equal(isDisabledPartName('Vivo Y21 Camera Glass'), true);
  assert.equal(isDisabledPartName('Vivo Y21 Back Camera'), false);
  assert.equal(isDisabledPartName('Vivo Y21 Back Glass'), false);
});
