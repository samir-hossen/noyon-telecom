import { useEffect } from 'react';
import { trackPageview } from '../analytics.js';

const SITE_NAME = 'Noyon Telecom';
const DEFAULT_TITLE = SITE_NAME + ' — Wholesale Mobile Phone Spare Parts';
const DEFAULT_DESCRIPTION =
  "Bangladesh's trusted wholesale importer & distributor of mobile phone spare parts — displays, batteries, back glass and more, for dealers, shops and service centers.";

// Pins canonical/og:url to one real production domain, same idea as the
// backend's required SITE_URL (see sitemap.routes.js) — set VITE_SITE_URL
// as a build-time env var before going live. Falls back to whatever origin
// actually served the page so nothing breaks (or needs configuring) in
// local dev or before that env var is set.
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

function setMeta(name, content, attr) {
  attr = attr || 'name';
  if (!content) return;
  let tag = document.querySelector('meta[' + attr + '="' + name + '"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Like setMeta, but removes the tag entirely when content is falsy instead
// of just leaving it alone — used for `robots` so a noindex page (like 404)
// doesn't leave `noindex` stuck in <head> for the next page the person
// navigates to, which wouldn't call this with noindex itself.
function setOrRemoveMeta(name, content, attr) {
  attr = attr || 'name';
  let tag = document.querySelector('meta[' + attr + '="' + name + '"]');
  if (!content) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(url) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', url);
}

// Injects/updates a <script type="application/ld+json"> block. `id` lets a
// page have more than one distinct structured-data block (e.g. Product +
// BreadcrumbList) without clobbering each other, and ensures the block gets
// removed if the page navigates away without setting a new one.
function setJsonLd(id, data) {
  const tagId = 'ld-json-' + id;
  let tag = document.getElementById(tagId);
  if (!data) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = tagId;
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

// Sets the document title and page-level meta tags (description + Open Graph +
// Twitter card + canonical + optional JSON-LD structured data) for SEO and
// social share previews. Call once per page/route.
// title: page-specific title, falls back to the site default.
// description: page-specific meta description (~150-160 chars ideal).
// image: absolute URL to a share image, falls back to the site default OG image.
// canonicalPath: optional clean path (no query string) to canonicalize to —
// important for /shop, which otherwise generates near-infinite duplicate
// URLs from category/brand/sort/page/search combinations.
// jsonLd: optional { id, data } (or array of them) for structured data.
// noindex: set true for pages that shouldn't be indexed (404, thank-you/
// confirmation pages, etc). Since this is a client-rendered SPA, an unknown
// route still serves the app shell with an HTTP 200 unless the host is
// configured to send a real 404 status — this tag is the fallback that
// tells crawlers not to index the page's content regardless of status code.
export function usePageMeta(title, description, image, canonicalPath, jsonLd, noindex) {
  useEffect(() => {
    const fullTitle = title ? title + ' — ' + SITE_NAME : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    // Drops the query string when a page doesn't pass its own canonicalPath
    // (e.g. /request-quote?productId=... prefilled from a product page, or
    // /verify-email?token=...) — the underlying page content is identical
    // regardless of those params, so the old `window.location.href` default
    // was minting a distinct "canonical" URL per query-string combination
    // instead of pointing every variant at the one real page.
    const canonicalUrl = SITE_ORIGIN + (canonicalPath || window.location.pathname);

    document.title = fullTitle;
    setMeta('description', desc);
    setOrRemoveMeta('robots', noindex ? 'noindex, nofollow' : null);

    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    // og:url should match canonical, not the raw browser URL — otherwise a
    // link shared from a URL carrying ?utm_source=/fbclid=/etc tracking
    // params gets that tracking noise baked into the share preview's URL.
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:type', 'website', 'property');
    if (image) setMeta('og:image', image, 'property');

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    if (image) setMeta('twitter:image', image);

    setCanonical(canonicalUrl);

    const ldBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    ldBlocks.forEach((block) => setJsonLd(block.id, block.data));

    trackPageview(window.location.pathname, fullTitle);

    // Clean up this page's JSON-LD blocks (and any noindex tag) on unmount
    // so neither leaks into the next page if it doesn't set its own.
    return () => {
      ldBlocks.forEach((block) => setJsonLd(block.id, null));
      if (noindex) setOrRemoveMeta('robots', null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, image, canonicalPath, JSON.stringify(jsonLd), noindex]);
}

// Back-compat alias for older call sites that only set a title.
export function usePageTitle(title) {
  usePageMeta(title);
}
