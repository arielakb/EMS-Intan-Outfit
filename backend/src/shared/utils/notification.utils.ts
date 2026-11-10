import prisma from '../database/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  referenceType?: string;
  referenceId?: string;
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      notificationType: params.notificationType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
    },
  });
};

export const createNotificationForAllOwners = async (
  title: string,
  message: string,
  notificationType: NotificationType,
  referenceType?: string,
  referenceId?: string,
): Promise<void> => {
  const owners = await prisma.user.findMany({
    where: { role: 'OWNER', status: 'ACTIVE' },
    select: { id: true },
  });

  await Promise.all(
    owners.map((owner) =>
      createNotification({
        userId: owner.id,
        title,
        message,
        notificationType,
        referenceType,
        referenceId,
      }),
    ),
  );
};
