import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { PERMISSIONS } from '@agbms/shared';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../middleware/auth';

const router = Router();

router.get(
  '/group',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_GROUP),
  asyncHandler(async (_req, res) => {
    const subsidiaries = await prisma.subsidiary.findMany({
      orderBy: { name: 'asc' },
    });

    const [totalSales, totalStaff, todayAttendance, inventoryItems] = await Promise.all([
      prisma.sale.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.attendanceRecord.count({
        where: {
          checkIn: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.inventoryItem.findMany({
        include: { branch: true },
      }),
    ]);

    const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderLevel);

    res.json({
      kpis: {
        totalSales: totalSales._sum.amount || 0,
        activeStaff: totalStaff,
        lowStockAlerts: lowStockItems.length,
        todayAttendance,
      },
      subsidiaries: subsidiaries.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        isActive: s.isActive,
      })),
      lowStockItems: lowStockItems.slice(0, 5).map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        branch: item.branch.name,
      })),
    });
  })
);

router.get(
  '/food-center',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_SUBSIDIARY),
  asyncHandler(async (req: AuthRequest, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySales, pendingSales, totalExpenses, inventoryItems, todayCheckIns] =
      await Promise.all([
        prisma.sale.aggregate({
          where: { status: 'approved', date: { gte: today } },
          _sum: { amount: true },
        }),
        prisma.sale.count({ where: { status: 'pending' } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
        prisma.inventoryItem.findMany({ include: { branch: true } }),
        prisma.attendanceRecord.count({
          where: { checkIn: { gte: today } },
        }),
      ]);

    const lowStock = inventoryItems.filter((i) => i.quantity <= i.reorderLevel);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const salesTrend = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const result = await prisma.sale.aggregate({
          where: {
            status: 'approved',
            date: { gte: date, lt: nextDay },
          },
          _sum: { amount: true },
        });
        return {
          date: date.toISOString().split('T')[0],
          amount: result._sum.amount || 0,
        };
      })
    );

    res.json({
      kpis: {
        todaySales: todaySales._sum.amount || 0,
        pendingSales,
        totalExpenses: totalExpenses._sum.amount || 0,
        lowStockCount: lowStock.length,
        todayCheckIns,
      },
      salesTrend,
      lowStockItems: lowStock.slice(0, 5),
    });
  })
);

router.get(
  '/station',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_SUBSIDIARY),
  asyncHandler(async (_req, res) => {
    const station = await prisma.subsidiary.findFirst({ where: { slug: 'station' } });
    if (!station) return res.json({ kpis: {} });

    const [accounts, arTotal, bankAccounts, recentJournal] = await Promise.all([
      prisma.account.findMany({ where: { subsidiaryId: station.id, isActive: true } }),
      prisma.customerInvoice.aggregate({
        where: { subsidiaryId: station.id },
        _sum: { amount: true },
      }),
      prisma.bankAccount.findMany({ where: { subsidiaryId: station.id } }),
      prisma.journalTransaction.findMany({
        where: { subsidiaryId: station.id },
        include: { lines: { include: { account: { select: { name: true } } } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ]);

    const revenue = accounts.filter((a) => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
    const expenses = accounts.filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
    const assets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);

    res.json({
      kpis: {
        totalAssets: assets,
        totalRevenue: revenue,
        totalExpenses: expenses,
        netIncome: revenue - expenses,
        accountsReceivable: arTotal._sum.amount || 0,
        cashBalance: bankAccounts.reduce((s, b) => s + b.balance, 0),
        accountCount: accounts.length,
      },
      recentJournal,
    });
  })
);

router.get(
  '/airbnb',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_SUBSIDIARY),
  asyncHandler(async (_req, res) => {
    const property = await prisma.property.findFirst({
      include: { rooms: true },
    });

    if (!property) return res.json({ kpis: { occupied: 0, available: 0, total: 0 } });

    const rooms = property.rooms;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const available = rooms.filter((r) => r.status === 'available').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayRevenue, pendingBookings, activeGuests] = await Promise.all([
      prisma.bookingPayment.aggregate({ where: { date: { gte: today } }, _sum: { amount: true } }),
      prisma.booking.findMany({ where: { status: { in: ['reserved', 'checked_in'] } } }),
      prisma.booking.count({ where: { status: 'checked_in' } }),
    ]);

    const pending = pendingBookings.reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);

    res.json({
      kpis: {
        occupiedRooms: occupied,
        availableRooms: available,
        totalRooms: rooms.length,
        todayRevenue: todayRevenue._sum.amount || 0,
        pendingPayments: pending,
        activeGuests,
        occupancyRate: rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
      },
    });
  })
);

export default router;
