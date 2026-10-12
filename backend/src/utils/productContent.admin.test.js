import test from 'node:test';
import assert from 'node:assert/strict';
import { partOfProduct, describeNewProduct, suggestedSku } from './productContent.js';

test('partOfProduct: the part from the name first, else the category', () => {
  assert.deepEqual(partOfProduct('Xiaomi Redmi Note 13 Front Camera', 'Camera'), { partKey: 'frontCamera', modelLabel: 'Xiaomi Redmi Note 13' });
  assert.deepEqual(partOfProduct('Samsung Galaxy A15 Display', 'Display'), { partKey: 'display', modelLabel: 'Samsung Galaxy A15' });
  assert.deepEqual(partOfProduct('Vivo Y21 screen', 'Display'), { partKey: 'display', modelLabel: 'Vivo Y21 screen' });
});

test('describeNewProduct: the English template with the one Bangla line', () => {
  const d = describeNewProduct({ name: 'Samsung Galaxy A15 Display', category: 'Display' });
  assert.match(d, /^The Samsung Galaxy A15 Display is a complete replacement display/);
  assert.match(d, /Samsung Galaxy A15 এর ডিসপ্লে পাইকারি দামে/);
  assert.match(describeNewProduct({ name: 'Charger Cable', category: 'Accessories' }), /^Charger Cable — wholesale/);
});

test('suggestedSku: same pattern as the imported products', () => {
  assert.equal(suggestedSku('Samsung Galaxy A15 Display', 'Display'), 'NT-DIS-SAMSUNG-GALAXY-A15');
  assert.equal(suggestedSku('Samsung Galaxy J5 (2016) Ear Speaker', 'Speaker'), 'NT-ESPK-SAMSUNG-GALAXY-J5-2016');
  assert.equal(suggestedSku('Xiaomi Redmi 12 Logic Board', 'Logic Board'), 'NT-LB-XIAOMI-REDMI-12');
});
