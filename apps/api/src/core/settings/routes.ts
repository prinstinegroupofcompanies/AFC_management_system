import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { PERMISSIONS } from '@agbms/shared';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    const subsidiaries = await prisma.subsidiary.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, isActive: true, description: true },
    });

    const stats = await Promise.all([
      prisma.user.count({ where: { status: 'active' } }),
      prisma.role.count(),
      prisma.auditLog.count(),
    ]);

    res.json({
      subsidiaries,
      stats: {
        activeUsers: stats[0],
        roles: stats[1],
        auditLogs: stats[2],
      },
      system: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite',
      },
    });
  })
);

router.patch(
  '/subsidiaries/:id',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const { isActive, description } = req.body;
    const subsidiary = await prisma.subsidiary.update({
      where: { id: req.params.id },
      data: { isActive, description },
    });
    res.json(subsidiary);
  })
);

export default router;
