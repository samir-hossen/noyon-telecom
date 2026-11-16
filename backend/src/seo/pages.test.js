import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePage } from './pages.js';

test('invalid crawl URLs return a noindex 404 before any database lookup', async () => {
  for (const [path, page] of [
    ['/category/display', '999999999999999999999999999'],
    ['/category/display', '89478490'],
    ['/category/display', '2junk'], ['/category/display', '2.5'],
    ['/category/display', '-1'], ['/category/display', '0'],
    ['/category/display', ['1', '2']], ['/category/%E0%A4%A', undefined],
    ['/brand/samsung/display/extra', undefined], ['/product/a/b', undefined],
    ['/model/%2Ftest', undefined], ['/category', undefined], ['/unknown/route', undefined],
  ]) {
    const result = await resolvePage(path, { page });
    assert.equal(result.status, 404, `${path}?page=${page}`);
    assert.match(result.head.robots, /noindex/);
  }
});

test('existing charging-port category links still redirect permanently', async () => {
  for (const [path, location] of [
    ['/category/charging-port', '/category/charging-logic'],
    ['/brand/samsung/charging-port', '/brand/samsung/charging-logic'],
  ]) {
    assert.deepEqual(await resolvePage(path), { status: 301, location });
  }
});
