import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { JSDOM } from 'jsdom';

it('builds readable canonical policy pages and guide links without a catalog server', () => {
  const directory = mkdtempSync(join(tmpdir(), 'noyon-static-seo-'));
  try {
    mkdirSync(join(directory, 'dist'));
    writeFileSync(join(directory, 'dist/index.html'), '<!doctype html><html><head><title>Home</title><link rel="preload" as="image" href="/hero.webp"></head><body><div id="root"></div></body></html>');
    execFileSync(process.execPath, [resolve('scripts/generateStaticSeo.mjs')], { cwd: directory });
    const pages = ['delivery-policy', 'warranty-policy', 'refund-policy', 'privacy-policy', 'terms'];
    for (const slug of pages) {
      const html = readFileSync(join(directory, `dist/${slug}/index.html`), 'utf8');
      const doc = new JSDOM(html).window.document;
      expect(doc.querySelectorAll('h1')).toHaveLength(1);
      expect(doc.querySelectorAll('h2').length).toBeGreaterThanOrEqual(6);
      expect(doc.querySelector('#root').textContent.length).toBeGreaterThan(700);
      expect(doc.title).not.toBe('Home');
      expect(doc.querySelector('link[rel="canonical"]').href).toBe(`https://noyontelecom.com/${slug}/`);
      expect(doc.querySelector('link[rel="preload"][as="image"]')).toBeNull();
      expect(JSON.parse(doc.querySelector('script[data-static-seo]').textContent).url).toBe(`https://noyontelecom.com/${slug}/`);
      expect(doc.querySelector('a[href="/contact/"]')).not.toBeNull();
      expect(html).not.toMatch(/\{\{|undefined|\[\[ EDIT/);
    }
    const article = new JSDOM(readFileSync(join(directory, 'dist/blog/charging-logic-board-kenar-guide/index.html'), 'utf8')).window.document;
    expect(article.querySelector('header a[href="/about/"]').textContent).toBe('Noyon Telecom');
    expect(article.querySelector('article a[href="/category/charging-logic"]')).not.toBeNull();
    expect(article.querySelector('time').getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
