import { Server } from 'socket.io';
import { prisma } from './prisma';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  subsidiarySlug?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
}

export async function pushNotification(io: Server | undefined, payload: NotificationPayload) {
  if (!io) return null;

  const notification = await prisma.notification.create({
    data: {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      subsidiarySlug: payload.subsidiarySlug,
      entityType: payload.entityType,
      entityId: payload.entityId,
      userId: payload.userId,
    },
  });

  io.emit('notification:new', notification);
  return notification;
}
