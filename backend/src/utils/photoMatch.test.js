import test from 'node:test';
import assert from 'node:assert/strict';
import { photoKeys, withPhoto } from './photoMatch.js';

test('photoKeys: SKU or link name, plus an extra-photo number', () => {
  assert.deepEqual(photoKeys('NT-DIS-SAMSUNG-GALAXY-A15.jpg'), { exact: 'nt-dis-samsung-galaxy-a15', stripped: null, index: 1 });
  assert.deepEqual(photoKeys('samsung-galaxy-a15-display (2).jpeg'), { exact: 'samsung-galaxy-a15-display-(2)', stripped: 'samsung-galaxy-a15-display', index: 2 });
  assert.deepEqual(photoKeys('NT-DIS-SAMSUNG-GALAXY-A15-3.PNG'), { exact: 'nt-dis-samsung-galaxy-a15-3', stripped: 'nt-dis-samsung-galaxy-a15', index: 3 });
  // a model number at the end is tried whole first (the caller matches `exact` before `stripped`)
  assert.equal(photoKeys('NT-SIMTRAY-APPLE-IPHONE-11.jpg').exact, 'nt-simtray-apple-iphone-11');
  assert.equal(photoKeys('Vivo Y21 Display.webp').exact, 'vivo-y21-display');
});

test('withPhoto: main photo first, extras after, no placeholders, at most 8', () => {
  assert.deepEqual(withPhoto(['/images/parts/photos/display.webp'], 'a.jpg'), ['a.jpg']);
  assert.deepEqual(withPhoto(['old.jpg'], 'new.jpg'), ['new.jpg', 'old.jpg']);
  assert.deepEqual(withPhoto(['main.jpg'], 'side.jpg', { extra: true }), ['main.jpg', 'side.jpg']);
  assert.deepEqual(withPhoto(['a.jpg'], 'a.jpg'), ['a.jpg']);
  assert.equal(withPhoto(Array.from({ length: 10 }, (_, i) => `${i}.jpg`), 'x.jpg').length, 8);
});
