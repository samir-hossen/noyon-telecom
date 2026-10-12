import test from 'node:test';
import assert from 'node:assert/strict';
import { partPhotoSlug, partPhotoPath, partPreviewPath } from './partPhotos.js';

test('partPhotoSlug: by category, with front camera / ear speaker by name', () => {
  assert.equal(partPhotoSlug('Display', 'Samsung Galaxy A15 Display'), 'display');
  assert.equal(partPhotoSlug('Charging Port', 'Vivo Y21 Charging Port'), 'charging-port');
  assert.equal(partPhotoSlug('Camera', 'Xiaomi Redmi Note 13 Front Camera'), 'front-camera');
  assert.equal(partPhotoSlug('Speaker', 'Oppo A57 Ear Speaker'), 'ear-speaker');
  assert.equal(partPhotoSlug('Something Else', 'X'), 'default');
  // the name's part word wins over a wrong or second category
  assert.equal(partPhotoSlug('Flex', 'Vivo Y21 Charging Port'), 'charging-port');
  assert.equal(partPhotoSlug('Speaker', 'Oppo A57 Loudspeaker'), 'speaker');
  assert.equal(partPhotoSlug('Flex', 'Xiaomi Redmi 9 Motherboard Flex Cable'), 'flex');
  assert.equal(partPhotoPath('Logic Board'), '/images/parts/photos/logic-board.webp');
  assert.equal(partPreviewPath('SIM Tray'), '/images/parts/og/sim-tray.jpg');
});
