import { PrismaClient } from '@prisma/client';

// A single shared instance avoids exhausting Postgres connections when the
// dev server hot-reloads (each reload would otherwise open a fresh pool).
const prisma = new PrismaClient();

export default prisma;
