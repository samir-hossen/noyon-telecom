import { Router } from 'express';
import { resolvePage } from '../seo/pages.js';
import { getShell, renderPage } from '../seo/html.js';
import { STOREFRONT_HEADERS } from '../config/storefront.js';

// Server-rendered catalog pages. On the live site, Render rewrite rules send
// noyontelecom.com/product/*, /category/*, /brand/* and /model/* here (see
// render.yaml), so Google and link previews get the real title, H1, text and
// JSON-LD without running JavaScript; the React app then loads on top.
export const seoHtmlRouter = Router();

seoHtmlRouter.get(['/product/:a', '/category/:a', '/brand/:a', '/brand/:a/:b', '/model/:a'], async (req, res, next) => {
  try {
    const model = await resolvePage(req.path, { page: req.query.page });
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.set(STOREFRONT_HEADERS);
    if (model.status === 301) {
      res.set('Cache-Control', 'public, max-age=3600');
      return res.redirect(301, model.location);
    }
    const html = renderPage(await getShell(), model);
    res.set('Cache-Control', model.status === 200 ? 'public, max-age=300' : 'no-store');
    res.status(model.status).type('html').send(html);
  } catch (err) {
    next(err);
  }
});

// The same page text for the storefront (title, meta, H1, intro, FAQ,
// breadcrumb, brand/model links) — one source for both.
export const seoApiRouter = Router();

seoApiRouter.get('/page', async (req, res, next) => {
  try {
    const model = await resolvePage(String(req.query.path || ''), { page: req.query.page });
    res.set('Cache-Control', 'public, max-age=60');
    // Product lists come from the regular /api/products calls; this is just
    // the page's text and links.
    const page = { ...model };
    delete page.products;
    delete page.related;
    delete page.product;
    res.json(page);
  } catch (err) {
    next(err);
  }
});
