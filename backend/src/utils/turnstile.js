// Verifies a Cloudflare Turnstile token server-side. If no secret key is
// configured, verification is skipped entirely — same no-op-when-unconfigured
// pattern as verifyRecaptcha() (utils/recaptcha.js), so a form using this
// keeps working with zero setup until real Turnstile keys are added.
export async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    // A Turnstile outage shouldn't take the whole site down with it.
    return true;
  }
}
