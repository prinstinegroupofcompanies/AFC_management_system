import { Router } from 'express';
import { createSaleSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SALES_VIEW),
  asyncHandler(async (req, res) => {
    const { status, startDate, endDate } = req.query;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(sales);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SALES_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createSaleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const sale = await prisma.sale.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        staffId: req.user!.userId,
      },
      include: {
        staff: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(req.user!.userId, 'create', 'Sale', sale.id, { amount: sale.amount });

    const io = req.app.get('io');
    if (io) io.emit('sales:updated', { type: 'new', sale });
    await pushNotification(io, {
      type: 'sales',
      title: 'New Sale Recorded',
      message: `$${sale.amount.toFixed(2)} sale by ${sale.staff.name} — pending approval`,
      subsidiarySlug: 'food_center',
      entityType: 'Sale',
      entityId: sale.id,
    });

    res.status(201).json(sale);
  })
);

router.patch(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.SALES_APPROVE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError(400, 'Status must be approved or rejected');
    }

    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: {
        status,
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        staff: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(req.user!.userId, status, 'Sale', sale.id);

    const io = req.app.get('io');
    if (io) io.emit('sales:updated', { type: status, sale });
    await pushNotification(io, {
      type: 'sales',
      title: `Sale ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `$${sale.amount.toFixed(2)} sale by ${sale.staff.name} was ${status}`,
      subsidiarySlug: 'food_center',
      entityType: 'Sale',
      entityId: sale.id,
    });

    res.json(sale);
  })
);

export default router;
