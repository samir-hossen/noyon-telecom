// The storefront used to install an offline-first service worker. That was a
// bad trade for a live catalog: it could keep an old app shell and old product
// thumbnails after an admin uploaded new photos, so customers only saw them
// after a hard refresh. Hashed JS/CSS and Cloudinary already provide fast,
// safe HTTP caching; remove the legacy worker/caches and let every navigation
// revalidate current catalog data from the network.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const names = await window.caches.keys();
        const legacyNames = names.filter((name) =>
          name.startsWith('workbox-') || name === 'route-chunks' || name === 'image-cache' || name === 'google-fonts'
        );
        await Promise.all(legacyNames.map((name) => window.caches.delete(name)));
      }

      // One automatic normal reload releases an already-controlled tab from
      // the removed worker. The session flag prevents any reload loop.
      const resetKey = 'nt-service-worker-cache-cleared-v1';
      if (hadController && !sessionStorage.getItem(resetKey)) {
        sessionStorage.setItem(resetKey, '1');
        window.location.reload();
      }
    } catch {
      // Private browsing can block service-worker/cache APIs. The storefront
      // remains fully functional and network-first without this cleanup.
    }
  }, { once: true });
}
