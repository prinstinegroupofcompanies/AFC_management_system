import { Router } from 'express';
import { createAccountSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';
import { getStationSubsidiaryId } from '../helpers';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_VIEW),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const accounts = await prisma.account.findMany({
      where: { subsidiaryId },
      orderBy: { code: 'asc' },
    });
    res.json(accounts);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const subsidiaryId = await getStationSubsidiaryId();
    const account = await prisma.account.create({
      data: { ...parsed.data, subsidiaryId },
    });

    await createAuditLog(req.user!.userId, 'create', 'Account', account.id);
    res.status(201).json(account);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await createAuditLog(req.user!.userId, 'update', 'Account', account.id);
    res.json(account);
  })
);

export default router;
