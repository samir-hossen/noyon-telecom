import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExistingName, buildName, fixToken, modelKey } from './names.js';

function clean(name, brandField, part) {
  const { brand, models } = parseExistingName(name, brandField);
  return { brand, ...buildName({ brand, models, part }) };
}

test('names: abbreviations, typos, casing, separators', () => {
  assert.deepEqual(clean('RM 8 / 8A / 8A Dual — Charging Port', 'Xiaomi', 'Charging Port'), {
    brand: 'Xiaomi',
    name: 'Xiaomi Redmi 8 / 8A / 8A Dual Charging Port',
    compatibleModels: ['Xiaomi Redmi 8', 'Xiaomi Redmi 8A', 'Xiaomi Redmi 8A Dual'],
  });
  assert.equal(clean('INF HOT 11 / HOT 11S / HOT 11 PLAY — Charging Port', 'Infinix', 'Charging Port').name, 'Infinix Hot 11 / Hot 11S / Hot 11 Play Charging Port');
  assert.deepEqual(clean('Redmi Note 8 / Note 8 Pro / Note 8T — SIM Tray', 'Xiaomi', 'SIM Tray').compatibleModels,
    ['Xiaomi Redmi Note 8', 'Xiaomi Redmi Note 8 Pro', 'Xiaomi Redmi Note 8T']);
  assert.equal(clean('VV Y21 Logic Board', 'Vivo', 'Logic Board').name, 'Vivo Y21 Logic Board');
  assert.equal(clean('SAM A12 Logic Board', 'Samsung', 'Logic Board').name, 'Samsung Galaxy A12 Logic Board');
  assert.equal(clean('Samsung A55 Back Glass', 'Samsung', 'Back Glass').name, 'Samsung Galaxy A55 Back Glass');
  assert.equal(clean('Vivoy18 — SIM Tray', 'Vivo', 'SIM Tray').name, 'Vivo Y18 SIM Tray');
  assert.equal(clean('Oppo a3pro — SIM Tray', 'Oppo', 'SIM Tray').name, 'Oppo A3 Pro SIM Tray');
  assert.equal(clean('Redmi Note 13 (4G Version) — SIM Tray', 'Xiaomi', 'SIM Tray').name, 'Xiaomi Redmi Note 13 4G SIM Tray');
  assert.equal(clean('OPPO F17 / F17 Pro — SIM Tray', 'Oppo', 'SIM Tray').name, 'Oppo F17 / F17 Pro SIM Tray');
  assert.equal(clean('Radme 9 Display', null, 'Display').name, 'Redmi 9 Display'); // brand decided by the caller
  assert.equal(clean('13 C Display', 'Xiaomi', 'Display').name, 'Xiaomi Redmi 13C Display');
  assert.equal(clean('iPhone 12 mini Back Glass', 'Apple', 'Back Glass').name, 'iPhone 12 mini Back Glass');
  assert.equal(clean('POCO F2 Pro Back Glass', 'Xiaomi', 'Back Glass').name, 'Xiaomi Poco F2 Pro Back Glass');
  assert.equal(clean('Itel A60 Display', 'itel', 'Display').name, 'Itel A60 Display');
  const mixed = clean('ITEL POP 8 / Tecno Spark Go 2024 — Charging Port', 'Itel', 'Charging Port');
  assert.equal(mixed.name, 'Itel Pop 8 / Tecno Spark Go 2024 Charging Port');
  assert.deepEqual(mixed.compatibleModels, ['Itel Pop 8', 'Tecno Spark Go 2024']);
  assert.deepEqual(clean('A13 / A23 Display', 'Samsung', 'Display').compatibleModels, ['Samsung Galaxy A13', 'Samsung Galaxy A23']);
});

test('names: Realme REA code, Core models, follow-ons checked against market data', () => {
  assert.equal(clean('REA C30 / C30s / C31 — Charging Port', 'Realme', 'Charging Port').name, 'Realme C30 / C30s / C31 Charging Port');
  assert.equal(clean('A01CORE — SIM Tray', 'Samsung', 'SIM Tray').name, 'Samsung Galaxy A01 Core SIM Tray');
  const known = new Set(['xiaomi redmi a2', 'xiaomi redmi a2+', 'realme c25']);
  const knownModel = (m) => known.has(m.toLowerCase());
  const { brand, models } = parseExistingName('RM A1 / A1+ / A2 / A2+ — Charging Port', 'Xiaomi');
  assert.deepEqual(buildName({ brand, models, part: 'Charging Port', knownModel }).compatibleModels,
    ['Xiaomi Redmi A1', 'Xiaomi Redmi A1+', 'Xiaomi Redmi A2', 'Xiaomi Redmi A2+']);
  const narzo = parseExistingName('REA Narzo 30A / C25 — Charging Port', 'Realme');
  assert.deepEqual(buildName({ ...narzo, part: 'Charging Port', knownModel }).compatibleModels, ['Realme Narzo 30A', 'Realme C25']);
});

test('names: a follow-on that names a brand stays its own model', () => {
  const a = clean('REA Narzo 20 / REA 7i — Charging Port', 'Realme', 'Charging Port');
  assert.equal(a.name, 'Realme Narzo 20 / Realme 7i Charging Port');
  assert.deepEqual(a.compatibleModels, ['Realme Narzo 20', 'Realme 7i']);
  const b = clean('REA C1 / OPPO A3S — Charging Port', 'Realme', 'Charging Port');
  assert.equal(b.name, 'Realme C1 / Oppo A3s Charging Port');
  assert.deepEqual(b.compatibleModels, ['Realme C1', 'Oppo A3s']);
});

test('names: network variants in brackets', () => {
  const a = clean('Redmi 13 / 13C (4G / 5G) — SIM Tray', 'Xiaomi', 'SIM Tray');
  assert.equal(a.name, 'Xiaomi Redmi 13 / 13C (4G / 5G) SIM Tray');
  assert.deepEqual(a.compatibleModels, ['Xiaomi Redmi 13', 'Xiaomi Redmi 13C']);
  const b = clean('Realme 9 (4G) / 9i — SIM Tray', 'Realme', 'SIM Tray');
  assert.equal(b.name, 'Realme 9 4G / 9i SIM Tray');
  assert.deepEqual(b.compatibleModels, ['Realme 9 4G', 'Realme 9i']);
  assert.deepEqual(clean('Vivo Y27 (4G / 5G) / Y28 (4G / 5G) — SIM Tray', 'Vivo', 'SIM Tray').compatibleModels, ['Vivo Y27', 'Vivo Y28']);
  assert.deepEqual(clean('OP F5 / A73 (2017) — Charging Port', 'Oppo', 'Charging Port').compatibleModels, ['Oppo F5', 'Oppo A73 (2017)']);
  assert.deepEqual(clean('POCO M2 / M3 / M4 Pro (4G) / M5 — SIM Tray', 'Xiaomi', 'SIM Tray').compatibleModels,
    ['Xiaomi Poco M2', 'Xiaomi Poco M3', 'Xiaomi Poco M4 Pro 4G', 'Xiaomi Poco M5']);
  assert.equal(clean('Realme 11 (4G) / 11x 5G — SIM Tray', 'Realme', 'SIM Tray').name, 'Realme 11 4G / 11x 5G SIM Tray');
});

test('names: token casing', () => {
  assert.equal(fixToken('V21E'), 'V21e');
  assert.equal(fixToken('Y02S'), 'Y02s');
  assert.equal(fixToken('A3X'), 'A3x');
  assert.equal(fixToken('y56'), 'Y56');
  assert.equal(fixToken('20i'), '20i');
  assert.equal(fixToken('8A'), '8A');
  assert.equal(fixToken('11x'), '11x');
  assert.equal(fixToken('11pro'), '11 Pro');
  assert.equal(fixToken('HD'), 'HD');
  assert.equal(fixToken('PRO'), 'Pro');
  assert.equal(fixToken('mini'), 'mini');
});

test('names: modelKey ignores brand words, Galaxy and punctuation', () => {
  assert.equal(modelKey('Samsung Galaxy A15'), modelKey('Samsung A15'));
  assert.equal(modelKey('Xiaomi Redmi Note 13 4G'), 'redminote134g');
  assert.notEqual(modelKey('Vivo Y100 4G'), modelKey('Vivo Y100 5G'));
});
