import { Router } from 'express';
import { createRoomSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';
import { getDefaultPropertyId } from '../helpers';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_VIEW),
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({
      include: {
        property: { select: { id: true, name: true } },
        bookings: {
          where: { status: { in: ['reserved', 'checked_in'] } },
          include: { guest: { select: { name: true } } },
          orderBy: { checkIn: 'desc' },
          take: 1,
        },
      },
      orderBy: { number: 'asc' },
    });
    res.json(rooms);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const propertyId = parsed.data.propertyId || (await getDefaultPropertyId());
    const room = await prisma.room.create({
      data: { ...parsed.data, propertyId },
      include: { property: { select: { name: true } } },
    });

    await createAuditLog(req.user!.userId, 'create', 'Room', room.id);
    const io = req.app.get('io');
    await pushNotification(io, {
      type: 'room',
      title: 'Room Added',
      message: `Room ${room.number} (${room.type}, ${room.beds} bed${room.beds > 1 ? 's' : ''}) added to ${room.property.name}`,
      subsidiarySlug: 'airbnb',
      entityType: 'Room',
      entityId: room.id,
    });
    res.status(201).json(room);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await createAuditLog(req.user!.userId, 'update', 'Room', room.id);
    res.json(room);
  })
);

router.get(
  '/inventory',
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_VIEW),
  asyncHandler(async (_req, res) => {
    const inventory = await prisma.roomInventory.findMany({
      include: { room: { select: { number: true, type: true } } },
      orderBy: { room: { number: 'asc' } },
    });
    res.json(inventory);
  })
);

router.post(
  '/:id/inventory',
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { itemName, category, quantity, condition } = req.body;
    const item = await prisma.roomInventory.create({
      data: {
        roomId: req.params.id,
        itemName,
        category,
        quantity: quantity || 1,
        condition: condition || 'good',
      },
    });
    res.status(201).json(item);
  })
);

export default router;
