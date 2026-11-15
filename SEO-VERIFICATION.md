# SEO and search verification — 15 November 2026

## Changes in this update

- `/about` and `/contact` previously returned the generic app title, no H1 and no canonical in their initial HTML (live HTTP inspection). Both now have build-time HTML, visible business information, individual titles/descriptions/canonicals, and AboutPage/ContactPage schema linked to the existing store entity. No runtime database calls were added.
- Static blog and business pages no longer preload the unused homepage hero image. Their page-specific schema is removed when React navigates to another page, while the shared business identity stays intact.
- Bengali model digits and punctuation are normalized in site search. `phone` no longer autocorrects to `iphone`. Corrected queries are shown to the customer. Plus-model notation is retained as `plus`.
- The PostgreSQL typo fallback now requires every query word to match; numeric model codes and known brands/parts are exact tokens. A missing model or unrelated extra word cannot be hidden by a high whole-query similarity score. This is a fallback constraint, not a claim that substring-based normal browsing excludes every related model variant.
- Search-index hits are rechecked against published storefront products before returning them. Existing five-minute search caches, category caches, debounce and hosting limits remain unchanged.
- IndexNow notifications drain imports over 10,000 URLs, deduplicate and bound their queue, and retry transient failures once with backoff. Hidden/deleted product notifications remain supported. The sitemap remains the full discovery source; the in-memory queue is best effort and does not survive a restart.
- Internal SKUs are no longer submitted as manufacturer part numbers. Phone-compatibility brands are labeled as compatibility in Product schema, and are no longer presented as the replacement part's manufacturer in the Merchant feed. Unknown GTIN/MPN/manufacturer data is omitted rather than invented.
- Google Business description was saved and verified in the business editor. It now states the 2016 establishment, wholesale spare-parts business, correct address, charging logic terminology, nationwide delivery and Sat–Thu 09:00–20:00 hours. Google controls when public displays refresh.

## Validation

- Frontend: 53 tests passed; production build and lint passed.
- Backend: full suite passed (352 passing, 1 optional PostgreSQL test skipped), plus the newly added API correction/empty-search regression test passed separately.
- The optional PostgreSQL integration test was also run successfully against a disposable local PostgreSQL 16 database with `pg_trgm`. Fixtures cover Bengali digits, transposed brand spellings, exact numeric codes, unknown model numbers, unrelated words, unpublished products, disabled categories and filter restrictions.
- Generated About/Contact HTML checked for one H1, the expected canonical, visible business facts, valid JSON-LD and no unused hero preload.
- No production catalog, stock, price, customer account or order records were changed.

## Remaining work that needs real data or an external decision

1. **Merchant identifiers:** Obtain the actual replacement-part manufacturer and any manufacturer-assigned GTIN/MPN from packaging/suppliers. Compatibility with Samsung/Apple is not evidence that the part was manufactured by them. The feed's missing identifiers may still need Merchant Center review; this change does not promise Shopping approval.
2. **Product evidence:** Continue adding original, correctly matched photographs, confirmed model compatibility, quality grade, stock and warranty terms. Generic category photos are not evidence of an exact model's part.
3. **Independent citations:** Verify publication of previously requested FindInBD/MobileDokan listings before counting them as backlinks. No new backlink is claimed by this code update. Prioritize real supplier/dealer references, accurate business listings and useful repair guides over bulk directory submissions.
4. **Search Console / Merchant Center:** Check indexing and feed diagnostics after deployment and recrawl. Validate representative product/category/business pages rather than repeatedly requesting the entire catalog. No indexing/ranking result is inferred merely from a successful HTTP response.
5. **Reviews and content:** Keep collecting voluntary reviews from genuine customers and publishing practical, original compatibility/repair-selection guides. No incentives, fabricated reviews, keyword-stuffed doorway pages or artificial AI endorsements.

Store search corrections affect searches on this website. Google and AI services independently decide which sites to retrieve or recommend. Neither first place nor an AI mention can be guaranteed.

## Sources

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) — normal SEO, crawlable text, internal links and accurate visible structured data; no special AI schema requirement or guaranteed inclusion.
- [Google Merchant Center: MPN](https://support.google.com/merchants/answer/6324482?hl=en) — use manufacturer-assigned identifiers, do not guess, and distinguish compatible-part manufacturers from phone brands.
- [IndexNow protocol](https://www.indexnow.org/documentation) — ownership verification and URL-change notifications; submission is not a ranking guarantee.
