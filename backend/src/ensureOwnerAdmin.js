import prisma from './prismaClient.js';

// One-time provisioning for a guaranteed-working admin login, run at boot
// (same reasoning as fixBrokenPlaceholderImages.js: this Render instance
// has no Shell/one-off-job access on the free tier, so `npm run seed`
// can't be run interactively — and seed.js only ever creates its admin
// account under SEED_ADMIN_EMAIL/PASSWORD, which may or may not have been
// set to something real when this was first deployed).
//
// The password hash below is precomputed (bcrypt, cost 12) so the real
// plaintext password never enters git history — it was handed to the
// store owner directly, outside this repo. Idempotent: does nothing once
// this exact account already exists, so it's safe to leave running on
// every future boot rather than needing to be pulled back out.
//
// Overridable via OWNER_ADMIN_EMAIL/OWNER_ADMIN_PASSWORD_HASH env vars —
// this email and hash are effectively public (baked into source), so
// anyone with repo access has a fixed offline target. Setting both env
// vars in Render lets that be rotated away from without a code change; to
// generate a new hash: `node -e "console.log(require('bcryptjs').hashSync('new-password', 12))"`.
// Leaving both unset keeps exactly today's behavior — nothing to do here
// unless/until you want to rotate it.
const OWNER_ADMIN_EMAIL = process.env.OWNER_ADMIN_EMAIL || 'owner@noyontelecom.com';
const OWNER_ADMIN_PASSWORD_HASH = process.env.OWNER_ADMIN_PASSWORD_HASH || '$2a$12$jHoshet38eCp2eP2Dbe2aO2URr5Vua8y0L0CBxRDP5kNfqrRdvUye';

export async function ensureOwnerAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: OWNER_ADMIN_EMAIL } });
  if (existing) return false;

  await prisma.user.create({
    data: {
      name: 'Noyon Telecom Owner',
      email: OWNER_ADMIN_EMAIL,
      passwordHash: OWNER_ADMIN_PASSWORD_HASH,
      role: 'admin',
      emailVerified: true,
    },
  });
  return true;
}
