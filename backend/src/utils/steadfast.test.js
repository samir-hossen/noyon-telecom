import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isSteadfastConfigured, createConsignment, getStatusByConsignmentId, getBalance } from './steadfast.js';

describe('Steadfast (not configured)', () => {
  let savedApiKey, savedSecretKey;
  before(() => {
    savedApiKey = process.env.STEADFAST_API_KEY;
    savedSecretKey = process.env.STEADFAST_SECRET_KEY;
    delete process.env.STEADFAST_API_KEY;
    delete process.env.STEADFAST_SECRET_KEY;
  });
  after(() => {
    if (savedApiKey !== undefined) process.env.STEADFAST_API_KEY = savedApiKey;
    if (savedSecretKey !== undefined) process.env.STEADFAST_SECRET_KEY = savedSecretKey;
  });

  test('isSteadfastConfigured is false with no keys set', () => {
    assert.equal(isSteadfastConfigured(), false);
  });

  test('createConsignment refuses to call the network without credentials', async () => {
    await assert.rejects(() => createConsignment({ invoice: '1', recipientPhone: '01700000000', recipientAddress: 'Dhaka' }), /not configured/);
  });

  test('getStatusByConsignmentId and getBalance also refuse without credentials', async () => {
    await assert.rejects(() => getStatusByConsignmentId(1), /not configured/);
    await assert.rejects(() => getBalance(), /not configured/);
  });
});

describe('Steadfast (configured, network mocked)', () => {
  let savedApiKey, savedSecretKey, savedFetch;
  before(() => {
    savedApiKey = process.env.STEADFAST_API_KEY;
    savedSecretKey = process.env.STEADFAST_SECRET_KEY;
    process.env.STEADFAST_API_KEY = 'test-key';
    process.env.STEADFAST_SECRET_KEY = 'test-secret';
    savedFetch = globalThis.fetch;
  });
  after(() => {
    if (savedApiKey !== undefined) process.env.STEADFAST_API_KEY = savedApiKey; else delete process.env.STEADFAST_API_KEY;
    if (savedSecretKey !== undefined) process.env.STEADFAST_SECRET_KEY = savedSecretKey; else delete process.env.STEADFAST_SECRET_KEY;
    globalThis.fetch = savedFetch;
  });
  afterEach(() => {
    globalThis.fetch = savedFetch;
  });

  test('isSteadfastConfigured is true once both keys are set', () => {
    assert.equal(isSteadfastConfigured(), true);
  });

  test('createConsignment sends the Api-Key/Secret-Key headers and returns the consignment on success', async () => {
    let capturedUrl, capturedInit;
    globalThis.fetch = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          message: 'Consignment has been created successfully.',
          consignment: { consignment_id: 123, tracking_code: 'ABC123', status: 'in_review' },
        }),
      };
    };

    const consignment = await createConsignment({
      invoice: 'order-1',
      recipientName: 'Test Customer',
      recipientPhone: '01700000000',
      recipientAddress: 'Gulistan, Dhaka',
      codAmount: 500,
    });

    assert.equal(capturedUrl, 'https://portal.steadfast.com.bd/api/v1/create_order');
    assert.equal(capturedInit.headers['Api-Key'], 'test-key');
    assert.equal(capturedInit.headers['Secret-Key'], 'test-secret');
    assert.deepEqual(JSON.parse(capturedInit.body), {
      invoice: 'order-1',
      recipient_name: 'Test Customer',
      recipient_phone: '01700000000',
      recipient_address: 'Gulistan, Dhaka',
      cod_amount: 500,
      note: '',
    });
    assert.equal(consignment.consignment_id, 123);
    assert.equal(consignment.tracking_code, 'ABC123');
  });

  test('createConsignment throws with the API-reported message on failure', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 400, message: 'Invoice already exists.' }),
    });

    await assert.rejects(
      () => createConsignment({ invoice: 'dup', recipientPhone: '01700000000', recipientAddress: 'Dhaka' }),
      /Invoice already exists/
    );
  });

  test('getStatusByConsignmentId returns the delivery_status field', async () => {
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://portal.steadfast.com.bd/api/v1/status_by_cid/123');
      return { ok: true, status: 200, json: async () => ({ delivery_status: 'delivered' }) };
    };
    assert.equal(await getStatusByConsignmentId(123), 'delivered');
  });
});
