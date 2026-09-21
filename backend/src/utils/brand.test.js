import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectBrandFromText } from './brand.js';

describe('detectBrandFromText', () => {
  test('matches a brand word that appears directly in the text', () => {
    assert.equal(detectBrandFromText('Samsung Galaxy A12 Display'), 'Samsung');
    assert.equal(detectBrandFromText('Vivo Y33s Display'), 'Vivo');
  });

  test('maps a sub-brand/product-line word to its real parent brand', () => {
    assert.equal(detectBrandFromText('iPhone 13 OLED Display Assembly'), 'Apple');
    assert.equal(detectBrandFromText('Redmi Note 9 Charging Port'), 'Xiaomi');
    assert.equal(detectBrandFromText('Poco X3 Battery'), 'Xiaomi');
    assert.equal(detectBrandFromText('Pixel 6 Back Glass'), 'Google');
  });

  test('is case-insensitive and matches whole words only', () => {
    assert.equal(detectBrandFromText('samsung a12 display'), 'Samsung');
    // "Lava" must not false-match inside an unrelated longer word.
    assert.equal(detectBrandFromText('Lavatory Cover Panel'), null);
  });

  test('returns null for a bare model code with no recognizable brand word', () => {
    assert.equal(detectBrandFromText('Y20 / Y52s Display'), null);
    assert.equal(detectBrandFromText('Not 7 Display'), null);
  });

  test('returns null for empty/missing input', () => {
    assert.equal(detectBrandFromText(''), null);
    assert.equal(detectBrandFromText(undefined), null);
  });
});
