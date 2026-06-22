import { Router } from 'express';
import { createGuestSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.GUESTS_VIEW),
  asyncHandler(async (_req, res) => {
    const guests = await prisma.guest.findMany({
      include: {
        bookings: {
          include: { room: { select: { number: true, type: true } } },
          orderBy: { checkIn: 'desc' },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(guests);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.GUESTS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createGuestSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const guest = await prisma.guest.create({ data: parsed.data });
    await createAuditLog(req.user!.userId, 'create', 'Guest', guest.id);
    res.status(201).json(guest);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.GUESTS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(guest);
  })
);

export default router;
