// Verifies a reCAPTCHA v3 token server-side. If no secret key is configured
// (local dev), verification is skipped entirely so the app keeps working
// without any reCAPTCHA setup — matching the frontend's getRecaptchaToken(),
// which itself resolves to null when no site key is configured.
export async function verifyRecaptcha(token, expectedAction) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    if (!data.success) return false;
    if (expectedAction && data.action !== expectedAction) return false;
    return data.score === undefined || data.score >= 0.5;
  } catch {
    // A reCAPTCHA outage shouldn't take the whole site down with it.
    return true;
  }
}
