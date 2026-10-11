import test from 'node:test';
import assert from 'node:assert/strict';
import { DISABLED_CATEGORIES, ACTIVE_CATEGORIES, isDisabledCategory, findDisabledCategory, disabledCategoryError, notInDisabledCategories } from './catalog.js';
import { buildProductWhere } from '../utils/productQuery.js';

test('battery section is OFF', async (t) => {
  await t.test('Battery is the switched-off category and not an active one', () => {
    assert.deepEqual(DISABLED_CATEGORIES, ['Battery']);
    assert.equal(ACTIVE_CATEGORIES.includes('Battery'), false);
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
  });

  await t.test('storefront listing queries exclude it; admin queries do not', () => {
    const storefront = buildProductWhere({ status: 'published', storefront: true });
    assert.deepEqual(storefront.AND, notInDisabledCategories());
    assert.deepEqual(storefront.AND, [{ NOT: { categories: { array_contains: 'Battery' } } }]);
    assert.equal('AND' in buildProductWhere({ status: 'all' }), false);
  });

  await t.test('search words and the category exclusion combine', () => {
    const where = buildProductWhere({ status: 'published', storefront: true, search: 'vivo y21' });
    assert.equal(where.AND.length, 3);
    assert.deepEqual(where.AND[2], { NOT: { categories: { array_contains: 'Battery' } } });
  });
});
