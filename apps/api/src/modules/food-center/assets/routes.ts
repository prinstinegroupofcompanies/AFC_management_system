import { Router } from 'express';
import { createAssetSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ASSETS_VIEW),
  asyncHandler(async (_req, res) => {
    const assets = await prisma.asset.findMany({
      include: {
        branch: { select: { id: true, name: true } },
        subsidiary: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(assets);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ASSETS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createAssetSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const subsidiary = await prisma.subsidiary.findFirst({
      where: { slug: 'food_center' },
    });
    if (!subsidiary) throw new AppError(404, 'Subsidiary not found');

    const asset = await prisma.asset.create({
      data: { ...parsed.data, subsidiaryId: subsidiary.id },
      include: { branch: { select: { id: true, name: true } } },
    });

    await createAuditLog(req.user!.userId, 'create', 'Asset', asset.id);
    res.status(201).json(asset);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ASSETS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: req.body,
      include: { branch: { select: { id: true, name: true } } },
    });
    await createAuditLog(req.user!.userId, 'update', 'Asset', asset.id);
    res.json(asset);
  })
);

export default router;
