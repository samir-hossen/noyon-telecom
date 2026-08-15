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
      workbox: {
        // Was previously set to '/offline.html'. vite-plugin-pwa registers
        // navigateFallback as a cache-only NavigationRoute BEFORE any
        // runtimeCaching entries (confirmed by inspecting the generated
        // dist/sw.js), so it unconditionally wins every navigation request
        // without ever attempting a network fetch. Since only "/" is
        // actually precached for an SPA like this one, that meant every
        // direct visit or refresh on any other route (e.g. /shop,
        // /admin/login) showed "You're offline" even on a completely
        // normal connection — a runtimeCaching rule for navigation
        // requests can't fix this, since it's registered after and never
        // gets reached. 'index.html' (vite-plugin-pwa's own default,
        // restored explicitly here for clarity) is what an SPA is actually
        // supposed to fall back to: any navigation not otherwise precached
        // instantly serves the cached app shell, and React Router then
        // renders the right page client-side from the URL — this is also
        // what makes navigation "work offline" in the first place.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Product/category/price data changes constantly — always try
            // the network first, only falling back to a cached copy (so the
            // page still renders something) when the request fails outright.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 6,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 },
            },
          },
          {
            // Product photos and uploads rarely change once created, so
            // cache-first keeps repeat views instant and saves bandwidth.
            urlPattern: ({ url }) => /\/uploads\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|avif|svg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
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
