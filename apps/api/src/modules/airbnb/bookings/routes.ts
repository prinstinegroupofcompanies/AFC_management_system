import { Router } from 'express';
import { createBookingSchema, bookingPaymentSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_VIEW),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        guest: { select: { id: true, name: true, email: true, phone: true } },
        room: { select: { id: true, number: true, type: true, rate: true } },
        payments: true,
      },
      orderBy: { checkIn: 'desc' },
    });
    res.json(bookings);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const { guestId, roomId, checkIn, checkOut, totalAmount, notes } = parsed.data;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError(404, 'Room not found');
    if (room.status !== 'available') throw new AppError(400, 'Room is not available');

    const conflicting = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { in: ['reserved', 'checked_in'] },
        OR: [
          { checkIn: { lte: new Date(checkOut) }, checkOut: { gte: new Date(checkIn) } },
        ],
      },
    });
    if (conflicting) throw new AppError(409, 'Room is already booked for these dates');

    const booking = await prisma.booking.create({
      data: {
        guestId,
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalAmount,
        notes,
      },
      include: {
        guest: { select: { name: true } },
        room: { select: { number: true, type: true } },
      },
    });

    await prisma.room.update({ where: { id: roomId }, data: { status: 'occupied' } });

    const io = req.app.get('io');
    if (io) io.emit('bookings:updated', { type: 'new', booking });
    await pushNotification(io, {
      type: 'booking',
      title: 'New Booking',
      message: `${booking.guest.name} booked Room ${booking.room.number}`,
      subsidiarySlug: 'airbnb',
      entityType: 'Booking',
      entityId: booking.id,
    });

    await createAuditLog(req.user!.userId, 'create', 'Booking', booking.id);
    res.status(201).json(booking);
  })
);

router.patch(
  '/:id/check-in',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'checked_in' },
      include: { guest: true, room: true },
    });

    await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'occupied' } });

    const io = req.app.get('io');
    if (io) io.emit('bookings:updated', { type: 'checkin', booking });
    await pushNotification(io, {
      type: 'booking',
      title: 'Guest Checked In',
      message: `${booking.guest.name} checked into Room ${booking.room.number}`,
      subsidiarySlug: 'airbnb',
      entityType: 'Booking',
      entityId: booking.id,
    });

    await createAuditLog(req.user!.userId, 'checkin', 'Booking', booking.id);
    res.json(booking);
  })
);

router.patch(
  '/:id/check-out',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'checked_out' },
      include: { guest: true, room: true },
    });

    await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'cleaning' } });

    await prisma.housekeepingTask.create({
      data: {
        roomId: booking.roomId,
        status: 'pending',
        scheduledDate: new Date(),
        notes: `Post-checkout cleaning for room ${booking.room.number}`,
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('bookings:updated', { type: 'checkout', booking });
    await pushNotification(io, {
      type: 'booking',
      title: 'Guest Checked Out',
      message: `${booking.guest.name} checked out of Room ${booking.room.number}`,
      subsidiarySlug: 'airbnb',
      entityType: 'Booking',
      entityId: booking.id,
    });

    await createAuditLog(req.user!.userId, 'checkout', 'Booking', booking.id);
    res.json(booking);
  })
);

router.post(
  '/:id/payments',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = bookingPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw new AppError(404, 'Booking not found');

    const payment = await prisma.bookingPayment.create({
      data: {
        bookingId: booking.id,
        ...parsed.data,
        date: new Date(parsed.data.date),
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paidAmount: { increment: parsed.data.amount } },
    });

    res.status(201).json(payment);
  })
);

export default router;
