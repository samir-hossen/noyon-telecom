// Meta (Facebook/Instagram) Pixel and TikTok Pixel loaders. Both follow the
// same pattern as GA4 in analytics.js: entirely optional, no-op until the
// corresponding VITE_*_PIXEL_ID env var is set, so this is safe to ship
// even before ad accounts are configured.

let metaLoaded = false;
let tiktokLoaded = false;

export function initMetaPixel() {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (!pixelId || metaLoaded || typeof window === 'undefined') return;
  metaLoaded = true;

  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function initTikTokPixel() {
  const pixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
  if (!pixelId || tiktokLoaded || typeof window === 'undefined') return;
  tiktokLoaded = true;

  /* eslint-disable */
  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function (t, e) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) {
      var e = ttq._i[t] || [];
      for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e, n) {
      var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      var o = d.createElement('script');
      o.type = 'text/javascript';
      o.async = true;
      o.src = i + '?sdkid=' + e + '&lib=' + t;
      var a = d.getElementsByTagName('script')[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, 'ttq');
  /* eslint-enable */
}

// eventId (optional) lets Meta de-duplicate this browser-side event against
// the matching server-side Conversions API event for the same action (see
// backend/src/utils/metaCapi.js) — without it, a Purchase that fires from
// both the browser Pixel and the backend gets counted twice.
export function fbqTrack(event, params, eventId) {
  if (!window.fbq) return;
  if (eventId) window.fbq('track', event, params, { eventID: eventId });
  else window.fbq('track', event, params);
}

export function ttqTrack(event, params) {
  if (window.ttq) window.ttq.track(event, params);
}
