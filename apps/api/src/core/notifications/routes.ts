import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest, authenticate } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId: req.user!.userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  })
);

router.get(
  '/unread-count',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const count = await prisma.notification.count({
      where: {
        read: false,
        OR: [{ userId: null }, { userId: req.user!.userId }],
      },
    });
    res.json({ count });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(notification);
  })
);

router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.notification.updateMany({
      where: {
        read: false,
        OR: [{ userId: null }, { userId: req.user!.userId }],
      },
      data: { read: true },
    });
    res.json({ message: 'All marked as read' });
  })
);

export default router;
