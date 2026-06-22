import { prisma } from '../lib/prisma';

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
