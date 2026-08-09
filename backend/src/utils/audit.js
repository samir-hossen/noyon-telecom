import prisma from '../prismaClient.js';

export async function logAdminAction(admin, action, details) {
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action,
      details: details ?? undefined,
    },
  });
}
