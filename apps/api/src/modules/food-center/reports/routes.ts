import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

function getDateRange(period: string) {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

router.get(
  '/sales',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, format } = req.query;
    const where: Record<string, unknown> = { status: 'approved' };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    if (format === 'csv') {
      const csv = ['Date,Staff,Branch,Amount,Status']
        .concat(
          sales.map(
            (s) =>
              `${s.date.toISOString().split('T')[0]},${s.staff.name},${s.branch.name},${s.amount},${s.status}`
          )
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      return res.send(csv);
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Staff', key: 'staff', width: 20 },
        { header: 'Branch', key: 'branch', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      sales.forEach((s) =>
        sheet.addRow({
          date: s.date.toISOString().split('T')[0],
          staff: s.staff.name,
          branch: s.branch.name,
          amount: s.amount,
          status: s.status,
        })
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
      await workbook.xlsx.write(res);
      return;
    }

    const total = sales.reduce((sum, s) => sum + s.amount, 0);
    res.json({ sales, total, count: sales.length });
  })
);

router.get(
  '/pnl',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || 'monthly';
    const { start, end } = getDateRange(period);

    const [sales, expenses, inventoryMovements] = await Promise.all([
      prisma.sale.aggregate({
        where: { status: 'approved', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.inventoryMovement.findMany({
        where: {
          type: 'in',
          status: 'approved',
          createdAt: { gte: start, lte: end },
        },
        include: { item: true },
      }),
    ]);

    const revenue = sales._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const cogs = inventoryMovements.reduce(
      (sum, m) => sum + m.quantity * m.item.costPrice,
      0
    );
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    res.json({
      period,
      startDate: start,
      endDate: end,
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      expensesByCategory: expensesByCategory.map((e) => ({
        category: e.category,
        amount: e._sum.amount || 0,
      })),
    });
  })
);

router.get(
  '/inventory',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const items = await prisma.inventoryItem.findMany({
      include: { branch: { select: { name: true } } },
    });
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        item: { select: { productName: true } },
        staff: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      items,
      movements,
      summary: {
        totalItems: items.length,
        totalValue: items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0),
        lowStock: items.filter((i) => i.quantity <= i.reorderLevel).length,
      },
    });
  })
);

router.get(
  '/attendance',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) (where.checkIn as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.checkIn as Record<string, Date>).lte = new Date(endDate as string);
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { user: { select: { name: true } }, branch: { select: { name: true } } },
      orderBy: { checkIn: 'desc' },
    });

    res.json({ records, total: records.length });
  })
);

router.get(
  '/vendors',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const vendors = await prisma.vendor.findMany({
      include: {
        invoices: { include: { payments: true } },
      },
    });

    res.json(
      vendors.map((v) => ({
        name: v.name,
        goodsSupplied: v.goodsSupplied,
        totalInvoiced: v.invoices.reduce((s, i) => s + i.amount, 0),
        totalPaid: v.invoices.reduce((s, i) => s + i.paidAmount, 0),
        amountOwed: v.invoices.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
        invoiceCount: v.invoices.length,
      }))
    );
  })
);

router.get(
  '/pnl/pdf',
  authenticate,
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || 'monthly';
    const { start, end } = getDateRange(period);

    const [sales, expenses] = await Promise.all([
      prisma.sale.aggregate({
        where: { status: 'approved', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const revenue = sales._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = revenue - totalExpenses;

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=pnl-report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Atlantic Group - Profit & Loss Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${period}`);
    doc.text(`From: ${start.toLocaleDateString()} To: ${end.toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Revenue: $${revenue.toFixed(2)}`);
    doc.text(`Expenses: $${totalExpenses.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(14).text(`Net Profit: $${netProfit.toFixed(2)}`, { underline: true });
    doc.end();
  })
);

export default router;
