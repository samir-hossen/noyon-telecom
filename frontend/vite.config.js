import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA: installable app + offline support. Registers a service worker
    // that precaches the built app shell and serves it (plus a friendly
    // offline page) when the network is unavailable — useful for dealers
    // browsing the catalog on patchy mobile connections.
    // `registerType: 'autoUpdate'` means once a new deployment is live,
    // the next tab reload silently picks up the new service worker — no
    // "stuck on old version" complaints from dealers with the site pinned.
    VitePWA({
      registerType: 'autoUpdate',
      // Make the generated worker take control as soon as its new precache is
      // ready, and remove caches left by older builds. registerServiceWorker
      // reloads an already-open page once on controllerchange.
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Do not intercept document navigations. The current HTML/app shell
        // must always come from the network; offline navigation caching was
        // the source of stale product photos after admin updates.
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/uploads\//, /\.(?:xml|txt)(?:\?|$)/],
        globIgnores: ['**/Admin-*.js', '**/xlsx-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'route-chunks',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => /\/uploads\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|avif|svg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      // Registration is done by src/registerServiceWorker.js instead of the
      // bare script this would otherwise inject into index.html — see that
      // file for why (the injected one never reloads the page when a new
      // worker takes over, so visitors kept seeing the previous deploy).
      injectRegister: null,
      // Matches the <link rel="manifest" href="/site.webmanifest"> already
      // in index.html, so nothing else needs to change.
      manifestFilename: 'site.webmanifest',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Noyon Telecom — Wholesale Mobile Phone Spare Parts',
        short_name: 'Noyon Telecom',
        description:
          "Bangladesh's wholesale importer & distributor of mobile phone spare parts for dealers, shops and service centers.",
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#e60023',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
  // `vite preview` (the built site) mirrors production routing: Render's
  // rewrite rules send catalog pages to the backend's server-rendered HTML
  // (/seo/...) and the sitemaps to the API — see render.yaml. Not used by
  // `vite dev` (its index.html isn't the built one the backend injects into).
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
      '^/(product|category|brand|model)/': { target: 'http://localhost:4000', changeOrigin: true, rewrite: (path) => `/seo${path}` },
      '^/sitemap(-[a-z]+)?\\.xml$': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => (path === '/sitemap.xml' ? '/api/sitemap-index.xml' : `/api${path}`),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split vendor code from app code so a deploy that only changes app
    // logic doesn't invalidate the (much larger, rarely-changing) React/
    // router bundle in every dealer's browser cache.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
