import { Router } from 'express';
import { createExpenseSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { upload } from '../../../lib/upload';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.EXPENSES_VIEW),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, category } = req.query;
    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        enteredBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.EXPENSES_CREATE),
  upload.single('receipt'),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const expense = await prisma.expense.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        enteredById: req.user!.userId,
        receiptUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      },
      include: {
        enteredBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(req.user!.userId, 'create', 'Expense', expense.id, {
      amount: expense.amount,
    });

    res.status(201).json(expense);
  })
);

export default router;
