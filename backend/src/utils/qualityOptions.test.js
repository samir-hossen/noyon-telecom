import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQualityOptions, parseOptionList, qualityOptionsFromMarket, qualityLabel, hasQualityOptions, looksWrong, MAX_QUALITY_OPTIONS } from './qualityOptions.js';

test('qualityLabel: supplier grade names -> our names', () => {
  assert.equal(qualityLabel('Original Quality'), 'Original');
  assert.equal(qualityLabel('  set original '), 'Original');
  assert.equal(qualityLabel('High Quality'), 'High Quality');
  assert.equal(qualityLabel('IPS'), 'IPS');
  assert.equal(qualityLabel('Incell'), 'Incell'); // unknown names pass through
});

test('normalizeQualityOptions: priced, one per label, cheapest first, capped', () => {
  assert.deepEqual(normalizeQualityOptions([
    { label: 'Original', price: 1699 },
    { label: 'High Quality', price: '999' },
    { label: 'original', price: 1800 }, // same label, dearer: dropped
    { label: 'Copy', price: 0 }, // no price: dropped
    { label: '', price: 500 },
    null,
  ]), [{ label: 'High Quality', price: 999 }, { label: 'Original', price: 1699 }]);
  assert.deepEqual(normalizeQualityOptions('nope'), []);
  const many = Array.from({ length: 12 }, (_, i) => ({ label: `G${i}`, price: 100 + i }));
  assert.equal(normalizeQualityOptions(many).length, MAX_QUALITY_OPTIONS);
});

test('parseOptionList: both market formats, "manual" = no rule price', () => {
  assert.deepEqual(parseOptionList('High Quality 1199 -> 999 | Original 1899 -> 1699'), [
    { model: '', label: 'High Quality', market: 1199, price: 999 },
    { model: '', label: 'Original', market: 1899, price: 1699 },
  ]);
  assert.deepEqual(parseOptionList('Vivo Y18 [Market Quality] 1649 -> 1449 | Vivo Y18 [Original Quality] 1899 -> manual'), [
    { model: 'Vivo Y18', label: 'Market Quality', market: 1649, price: 1449 },
    { model: 'Vivo Y18', label: 'Original Quality', market: 1899, price: null },
  ]);
});

test('qualityOptionsFromMarket: only for several grades of one model', () => {
  assert.deepEqual(qualityOptionsFromMarket('High Quality 1199 -> 999 | Original 1899 -> 1699'), [
    { label: 'High Quality', price: 999 },
    { label: 'Original', price: 1699 },
  ]);
  // merged duplicate listings
  assert.deepEqual(qualityOptionsFromMarket(['IPS 1999 -> 1799 | Original 5799 -> 5339', 'IPS 2099 -> 1899']), [
    { label: 'IPS', price: 1799 },
    { label: 'Original', price: 5339 },
  ]);
  // a grade the rule can't price is left out, the other one still shows
  assert.deepEqual(qualityOptionsFromMarket('Copy 299 -> manual | Set Original 1099 -> 899'), [{ label: 'Original', price: 899 }]);
  assert.deepEqual(qualityOptionsFromMarket('(single option) 1399 -> 1199'), []);
  assert.deepEqual(qualityOptionsFromMarket('Original 1899 -> 1699 | Original Quality 1999 -> 1799'), []); // one grade
  assert.deepEqual(qualityOptionsFromMarket('Vivo Y18 [IPS] 1649 -> 1449 | Vivo Y18s [Original] 1899 -> 1699'), []); // two models
});

test('hasQualityOptions', () => {
  assert.equal(hasQualityOptions({ qualityOptions: [{ label: 'Original', price: 1 }] }), true);
  assert.equal(hasQualityOptions({ qualityOptions: [] }), false);
  assert.equal(hasQualityOptions(null), false);
});

test('market grades that cannot be right are not shown (Original cheaper than a copy grade)', () => {
  assert.deepEqual(qualityOptionsFromMarket('Original 3829 -> 3629 | High Quality 18499 -> 17799'), []);
  assert.equal(looksWrong([{ label: 'IPS', price: 1799 }, { label: 'Original', price: 15599 }]), false);
  assert.equal(looksWrong([{ label: 'Original', price: 1099 }, { label: 'High Quality', price: 7299 }]), true);
});
