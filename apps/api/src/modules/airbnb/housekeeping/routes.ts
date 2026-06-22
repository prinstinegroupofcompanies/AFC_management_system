import { Router } from 'express';
import { PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.HOUSEKEEPING_VIEW),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const tasks = await prisma.housekeepingTask.findMany({
      where,
      include: { room: { select: { number: true, type: true } } },
      orderBy: { scheduledDate: 'desc' },
    });
    res.json(tasks);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.HOUSEKEEPING_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status, notes } = req.body;
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'completed') updateData.completedAt = new Date();

    const task = await prisma.housekeepingTask.update({
      where: { id: req.params.id },
      data: updateData,
      include: { room: true },
    });

    if (status === 'completed') {
      await prisma.room.update({
        where: { id: task.roomId },
        data: { status: 'available' },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('housekeeping:updated', { task });
      if (status === 'completed') {
        await pushNotification(io, {
          type: 'housekeeping',
          title: 'Housekeeping Complete',
          message: `Room ${task.room.number} cleaning completed — now available`,
          subsidiarySlug: 'airbnb',
          entityType: 'HousekeepingTask',
          entityId: task.id,
        });
      }
    }

    res.json(task);
  })
);

export default router;
