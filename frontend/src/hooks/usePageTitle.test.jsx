import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { usePageMeta } from './usePageTitle.js';

function Page({ title, description, image, canonicalPath }) {
  usePageMeta(title, description, image, canonicalPath);
  return null;
}

describe('usePageMeta canonical/og:url', () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove());
    document.querySelectorAll('meta[property="og:url"]').forEach((n) => n.remove());
  });

  it('strips the query string from the default canonical when the page passes no canonicalPath', () => {
    // Mirrors /request-quote?productId=...&name=... (prefilled from a
    // product page's "Request Quote" link) — the page itself is identical
    // regardless of those params, so every variant should canonicalize to
    // the one bare URL instead of each becoming its own "canonical" page.
    window.history.pushState({}, '', '/request-quote?productId=abc&name=Foo');
    render(<Page title="Request a Quote" />);
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical.getAttribute('href')).toBe(`${window.location.origin}/request-quote`);
  });

  it('honors an explicit canonicalPath over the raw URL', () => {
    window.history.pushState({}, '', '/shop?category=Battery&page=2&sort=price-asc');
    render(<Page title="Battery" canonicalPath="/shop?category=Battery" />);
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical.getAttribute('href')).toBe(`${window.location.origin}/shop?category=Battery`);
  });

  it('sets og:url to the exact same value as the canonical link, with no tracking params', () => {
    window.history.pushState({}, '', '/about?utm_source=facebook&fbclid=xyz');
    render(<Page title="About" />);
    const canonical = document.querySelector('link[rel="canonical"]').getAttribute('href');
    const ogUrl = document.querySelector('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toBe(canonical);
    expect(ogUrl).not.toMatch(/utm_source|fbclid/);
  });
});
