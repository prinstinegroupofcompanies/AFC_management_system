import { Router } from 'express';
import { checkInSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    const where: Record<string, unknown> = {};

    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.checkIn = { gte: d, lt: nextDay };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { checkIn: 'desc' },
    });

    res.json(records);
  })
);

router.post(
  '/check-in',
  authenticate,
  requirePermission(PERMISSIONS.ATTENDANCE_CHECKIN),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId: req.user!.userId,
        checkIn: { gte: today },
        checkOut: null,
      },
    });

    if (existing) {
      const record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkOut: new Date() },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      const io = req.app.get('io');
      if (io) io.emit('attendance:updated', { type: 'checkout', record });

      await createAuditLog(req.user!.userId, 'checkout', 'Attendance', record.id);
      return res.json({ ...record, action: 'checkout' });
    }

    const branch = parsed.data.branchId
      ? await prisma.branch.findUnique({ where: { id: parsed.data.branchId } })
      : await prisma.branch.findFirst();

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: req.user!.userId,
        branchId: branch?.id,
        checkIn: new Date(),
        method: parsed.data.method,
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:updated', { type: 'checkin', record });
      await pushNotification(io, {
        type: 'attendance',
        title: 'Staff Check-in',
        message: `${record.user.name} checked in`,
        subsidiarySlug: 'food_center',
        entityType: 'AttendanceRecord',
        entityId: record.id,
      });
    }

    await createAuditLog(req.user!.userId, 'checkin', 'Attendance', record.id);
    res.status(201).json({ ...record, action: 'checkin' });
  })
);

router.post(
  '/qr-check-in',
  authenticate,
  requirePermission(PERMISSIONS.ATTENDANCE_CHECKIN),
  asyncHandler(async (req: AuthRequest, res) => {
    const { qrCode } = req.body;
    if (!qrCode) throw new AppError(400, 'QR code required');

    const user = await prisma.user.findUnique({ where: { qrCode } });
    if (!user) throw new AppError(404, 'Invalid QR code');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceRecord.findFirst({
      where: { userId: user.id, checkIn: { gte: today }, checkOut: null },
    });

    if (existing) {
      const record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkOut: new Date() },
        include: { user: { select: { id: true, name: true } } },
      });

      const io = req.app.get('io');
      if (io) io.emit('attendance:updated', { type: 'checkout', record });

      return res.json({ ...record, action: 'checkout' });
    }

    const branch = await prisma.branch.findFirst();
    const record = await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        branchId: branch?.id,
        checkIn: new Date(),
        method: 'qr',
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:updated', { type: 'checkin', record });
      await pushNotification(io, {
        type: 'attendance',
        title: 'Staff Check-in',
        message: `${record.user.name} checked in`,
        subsidiarySlug: 'food_center',
        entityType: 'AttendanceRecord',
        entityId: record.id,
      });
    }

    await createAuditLog(req.user!.userId, 'qr_checkin', 'Attendance', record.id, {
      targetUser: user.id,
    });

    res.status(201).json({ ...record, action: 'checkin' });
  })
);

export default router;
