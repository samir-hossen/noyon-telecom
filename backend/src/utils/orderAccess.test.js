import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewOrder } from './orderAccess.js';

// Regression coverage for a real IDOR (insecure direct object reference)
// bug: GET /orders/:id previously had NO authorization check at all for
// guest orders (order.userId === null) — anyone who obtained the order id
// (a forwarded confirmation link, a screenshot, a browser-history entry)
// could view the full order: shipping name, address, phone, items. cuid
// ids aren't practically brute-forceable, but "hard to guess" alone is a
// materially weaker guarantee than an actual authorization check.
test('canViewOrder', async (t) => {
  const guestOrder = { id: 'o1', userId: null, guestEmail: 'real.customer@example.com' };
  const accountOrder = { id: 'o2', userId: 'u1', guestEmail: null };

  await t.test('a random stranger with no email cannot view a guest order', () => {
    assert.equal(canViewOrder(guestOrder, null, undefined), false);
  });

  await t.test('a random stranger with a guessed/wrong email cannot view a guest order', () => {
    assert.equal(canViewOrder(guestOrder, null, 'random@gmail.com'), false);
  });

  await t.test('the real guest customer, with their correct email, CAN view their order', () => {
    assert.equal(canViewOrder(guestOrder, null, 'real.customer@example.com'), true);
  });

  await t.test('email matching is case-insensitive (not a secret, just an identity match)', () => {
    assert.equal(canViewOrder(guestOrder, null, 'Real.Customer@EXAMPLE.com'), true);
  });

  await t.test('a logged-in user (not the guest) cannot view someone else\'s guest order just by being logged in', () => {
    assert.equal(canViewOrder(guestOrder, { id: 'someone-else', role: 'customer' }, undefined), false);
  });

  await t.test('a guest order with no guestEmail on record (shouldn\'t happen, but) is never viewable without an admin', () => {
    assert.equal(canViewOrder({ id: 'o3', userId: null, guestEmail: null }, null, ''), false);
  });

  await t.test('a stranger cannot view an account-based order', () => {
    assert.equal(canViewOrder(accountOrder, { id: 'u2', role: 'customer' }, undefined), false);
  });

  await t.test('a logged-out visitor cannot view an account-based order', () => {
    assert.equal(canViewOrder(accountOrder, null, undefined), false);
  });

  await t.test('the account owner CAN view their own order', () => {
    assert.equal(canViewOrder(accountOrder, { id: 'u1', role: 'customer' }, undefined), true);
  });

  await t.test('an admin can view any order — a guest order without providing the email', () => {
    assert.equal(canViewOrder(guestOrder, { id: 'a1', role: 'admin' }, undefined), true);
  });

  await t.test('an admin can view any order — someone else\'s account order', () => {
    assert.equal(canViewOrder(accountOrder, { id: 'a1', role: 'admin' }, undefined), true);
  });

  await t.test('a null order is never viewable by anyone (defensive default)', () => {
    assert.equal(canViewOrder(null, { id: 'a1', role: 'admin' }, undefined), false);
  });
});
