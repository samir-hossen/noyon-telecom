import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRails, RAIL_SIZE } from './homeRails.js';

test('buildRails: one rail per brand, parts in a fixed order, at most 6, empty brands dropped', () => {
  const picks = [
    { id: 'a', brand: 'Samsung', category: 'SIM Tray' },
    { id: 'b', brand: 'Samsung', category: 'Display' },
    { id: 'c', brand: 'Apple', category: 'Back Glass' },
    ...['Back Glass', 'Camera', 'Charging Port', 'Speaker', 'Flex', 'Frame'].map((category, i) => ({ id: `s${i}`, brand: 'Samsung', category })),
  ];
  const rails = buildRails(picks, ['Apple', 'Samsung', 'Xiaomi']);
  assert.deepEqual(rails.map((r) => r.brand), ['Apple', 'Samsung']);
  assert.deepEqual(rails[1].products.map((p) => p.category), ['Display', 'Back Glass', 'Camera', 'Charging Port', 'Speaker', 'SIM Tray']);
  assert.equal(rails[1].products.length, RAIL_SIZE);
});
