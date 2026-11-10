import prisma from '../database/prisma';

interface AuditLogParams {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}

export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: params.beforeData as any,
      afterData: params.afterData as any,
    },
  });
};
