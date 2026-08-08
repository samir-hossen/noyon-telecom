import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export function generateSecret(email) {
  return speakeasy.generateSecret({
    name: `${process.env.TOTP_ISSUER || 'Noyon Telecom'} (${email})`,
    issuer: process.env.TOTP_ISSUER || 'Noyon Telecom',
    length: 20,
  });
}

export async function secretToQrDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

export function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // allow the previous/next 30s window for clock drift
  });
}
