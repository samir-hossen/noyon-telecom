import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminAccessExpired,
  isPermanentAdmin,
  withEffectiveRole,
  expiryFromMinutes,
  MAX_TEMP_ADMIN_MINUTES,
} from './adminAccess.js';

const now = new Date('2026-09-25T12:00:00Z');
const past = new Date('2026-09-25T11:59:00Z');
const future = new Date('2026-09-25T12:10:00Z');

test('temporary admin access', async (t) => {
  await t.test('a permanent admin never expires', () => {
    const u = { role: 'admin', adminExpiresAt: null };
    assert.equal(isAdminAccessExpired(u, now), false);
    assert.equal(isPermanentAdmin(u), true);
    assert.equal(withEffectiveRole(u, now), u);
  });

  await t.test('a temporary admin keeps admin rights until the expiry time', () => {
    const u = { role: 'admin', adminExpiresAt: future };
    assert.equal(isAdminAccessExpired(u, now), false);
    assert.equal(isPermanentAdmin(u), false);
    assert.equal(withEffectiveRole(u, now).role, 'admin');
  });

  await t.test('once the time passes, the account is treated as a customer', () => {
    const u = { id: 'x', role: 'admin', adminExpiresAt: past };
    assert.equal(isAdminAccessExpired(u, now), true);
    const effective = withEffectiveRole(u, now);
    assert.equal(effective.role, 'customer');
    assert.equal(effective.adminAccessExpired, true);
    assert.equal(effective.id, 'x');
    assert.equal(u.role, 'admin', 'the stored user object is not mutated');
  });

  await t.test('expiry exactly at "now" counts as expired', () => {
    assert.equal(isAdminAccessExpired({ role: 'admin', adminExpiresAt: now }, now), true);
  });

  await t.test('ISO strings work as well as Date objects', () => {
    assert.equal(isAdminAccessExpired({ role: 'admin', adminExpiresAt: past.toISOString() }, now), true);
  });

  await t.test('non-admins are never affected, even with a stray expiry value', () => {
    const u = { role: 'dealer', adminExpiresAt: past };
    assert.equal(isAdminAccessExpired(u, now), false);
    assert.equal(withEffectiveRole(u, now), u);
    assert.equal(isPermanentAdmin(u), false);
    assert.equal(isAdminAccessExpired(null, now), false);
  });
});

test('expiryFromMinutes', async (t) => {
  await t.test('empty / missing means a permanent admin', () => {
    assert.equal(expiryFromMinutes('', now), null);
    assert.equal(expiryFromMinutes(null, now), null);
    assert.equal(expiryFromMinutes(undefined, now), null);
  });

  await t.test('minutes are added to now', () => {
    assert.equal(expiryFromMinutes(20, now).toISOString(), '2026-09-25T12:20:00.000Z');
    assert.equal(expiryFromMinutes('10', now).toISOString(), '2026-09-25T12:10:00.000Z');
  });

  await t.test('rejects zero, negatives, fractions, junk and anything over the cap', () => {
    for (const bad of [0, -5, 1.5, 'abc', MAX_TEMP_ADMIN_MINUTES + 1]) {
      assert.equal(expiryFromMinutes(bad, now), undefined, `value ${bad}`);
    }
  });
});
