import { Router } from 'express';
import { PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticate, requirePermission } from '../../../middleware/auth';
import { getAirbnbSubsidiaryId } from '../helpers';

const router = Router();

router.get(
  '/occupancy',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getAirbnbSubsidiaryId();
    const property = await prisma.property.findFirst({ where: { subsidiaryId } });
    if (!property) return res.json({ occupied: 0, available: 0, total: 0, occupancyRate: 0 });

    const rooms = await prisma.room.findMany({ where: { propertyId: property.id } });
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const available = rooms.filter((r) => r.status === 'available').length;
    const total = rooms.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRevenue = await prisma.bookingPayment.aggregate({
      where: { date: { gte: today } },
      _sum: { amount: true },
    });

    const pendingPayments = await prisma.booking.findMany({
      where: { status: { in: ['reserved', 'checked_in'] } },
    });
    const pending = pendingPayments.reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);

    res.json({
      occupied,
      available,
      cleaning: rooms.filter((r) => r.status === 'cleaning').length,
      maintenance: rooms.filter((r) => r.status === 'maintenance').length,
      total,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      todayRevenue: todayRevenue._sum.amount || 0,
      pendingPayments: pending,
    });
  })
);

export default router;
