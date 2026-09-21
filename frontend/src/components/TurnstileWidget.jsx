import { useEffect, useRef, useState } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let scriptLoad = null;
function loadTurnstileScript() {
  if (!scriptLoad) {
    scriptLoad = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Turnstile'));
      document.head.appendChild(script);
    });
  }
  return scriptLoad;
}

// Renders nothing at all when VITE_TURNSTILE_SITE_KEY isn't set (or the
// script fails to load) — a form using this component keeps working exactly
// as it did before Turnstile was added, with `onToken` simply never firing,
// same as getRecaptchaToken()'s no-op-when-unconfigured behavior in api.js.
export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) window.turnstile.remove(widgetIdRef.current);
    };
  }, []);

  if (!SITE_KEY || failed) return null;
  return <div ref={containerRef} style={{ margin: '12px 0' }} />;
}
