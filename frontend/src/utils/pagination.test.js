import { describe, it, expect } from 'vitest';
import { buildPageWindow } from './pagination.js';

describe('buildPageWindow', () => {
  it('shows every page when the catalog is small enough that first/current±1/last cover it all', () => {
    expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it('collapses the middle into a single ellipsis once pages exceed the window', () => {
    expect(buildPageWindow(1, 5)).toEqual([1, 2, '…', 5]);
  });

  it('shows a single page with no ellipses', () => {
    expect(buildPageWindow(1, 1)).toEqual([1]);
  });

  it('collapses a large catalog (e.g. 10,000 products / 12 per page = 834 pages) to a small, fixed-size strip', () => {
    const totalPages = 834; // 10,000+ products at 12/page
    const result = buildPageWindow(400, totalPages);
    // first, ellipsis, 399, 400, 401, ellipsis, last — 7 items, never one button per page
    expect(result).toEqual([1, '…', 399, 400, 401, '…', 834]);
    expect(result.length).toBeLessThan(10);
  });

  it('does not show a leading ellipsis when current page is near the start', () => {
    expect(buildPageWindow(1, 100)).toEqual([1, 2, '…', 100]);
  });

  it('does not show a trailing ellipsis when current page is near the end', () => {
    expect(buildPageWindow(100, 100)).toEqual([1, '…', 99, 100]);
  });

  it('never produces two consecutive ellipsis entries', () => {
    const result = buildPageWindow(50, 834);
    const consecutive = result.some((v, i) => v === '…' && result[i + 1] === '…');
    expect(consecutive).toBe(false);
  });
});
