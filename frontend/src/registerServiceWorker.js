// Service worker registration, replacing the bare one vite-plugin-pwa
// injects by default (see injectRegister: null in vite.config.js).
//
// The default injected script is just:
//   navigator.serviceWorker.register('/sw.js', { scope: '/' })
// which registers the worker but never tells the already-rendered page
// that a newer version took over. Combined with precaching, that means a
// visitor reliably sees the *previous* deployment: the SW serves the old
// cached shell instantly, downloads the new one in the background, and
// activates it (skipWaiting/clientsClaim are already on) — but nothing
// reloads the page, so the new assets only appear on some later visit.
// On a slow mobile connection the background download can also lose the
// race against a manual refresh, which is why "just refresh" and even a
// fresh Incognito tab kept showing stale content while the deployed files
// on the server were verifiably correct.
//
// Reloading on controllerchange closes that gap: the moment a new worker
// takes control, the page reloads once and picks up the new assets.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Whether this page load was already being served by a service worker.
  // On a visitor's very first load there's no controller yet, so the
  // initial takeover fires controllerchange too — but that page came
  // straight from the network and is already current, so reloading it
  // would be a pointless flash for every new visitor.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      // Never let the browser's HTTP cache hide a newly deployed worker.
      // Hashed JS/CSS/images remain long-cached; only this tiny version
      // manifest always checks the network.
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        // register() may reuse an existing registration without doing an
        // immediate byte-for-byte update check. Force one on every full page
        // load so a returning visitor gets the newest deployment right away.
        registration.update().catch(() => {});

        // A tab left open (or a PWA resumed from the background) would
        // otherwise only check for a new version on a full navigation.
        // a long-lived session still picks up a deployment on its own.
        // Checking when the tab becomes visible again, plus every five
        // minutes, means a long-lived session picks up a deployment quickly.
        // a long-lived session still picks up a deployment on its own.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
        setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);
      })
      .catch(() => {
        // Registration can fail legitimately (private browsing modes,
        // unsupported contexts) — the site works fine without the worker,
        // it just loses offline support, so this shouldn't surface an error.
      });
  });
}
