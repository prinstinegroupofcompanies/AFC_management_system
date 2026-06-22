import { Router } from 'express';
import {
  createCustomerSchema,
  createCustomerInvoiceSchema,
  PERMISSIONS,
} from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';
import { getStationSubsidiaryId } from '../helpers';

const router = Router();

router.get(
  '/customers',
  authenticate,
  requirePermission(PERMISSIONS.AR_VIEW),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const customers = await prisma.customer.findMany({
      where: { subsidiaryId },
      include: {
        invoices: { include: { payments: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(
      customers.map((c) => ({
        ...c,
        amountOwed: c.invoices.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
      }))
    );
  })
);

router.post(
  '/customers',
  authenticate,
  requirePermission(PERMISSIONS.AR_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const subsidiaryId = await getStationSubsidiaryId();
    const customer = await prisma.customer.create({
      data: { ...parsed.data, subsidiaryId },
    });

    await createAuditLog(req.user!.userId, 'create', 'Customer', customer.id);
    res.status(201).json(customer);
  })
);

router.post(
  '/invoices',
  authenticate,
  requirePermission(PERMISSIONS.AR_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createCustomerInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const subsidiaryId = await getStationSubsidiaryId();
    const invoice = await prisma.customerInvoice.create({
      data: {
        ...parsed.data,
        dueDate: new Date(parsed.data.dueDate),
        subsidiaryId,
      },
    });

    await createAuditLog(req.user!.userId, 'create', 'CustomerInvoice', invoice.id);
    res.status(201).json(invoice);
  })
);

router.post(
  '/invoices/:id/payments',
  authenticate,
  requirePermission(PERMISSIONS.AR_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { amount, date, method, notes } = req.body;
    if (!amount || amount <= 0) throw new AppError(400, 'Invalid payment amount');

    const invoice = await prisma.customerInvoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new AppError(404, 'Invoice not found');

    const payment = await prisma.customerPayment.create({
      data: {
        invoiceId: invoice.id,
        amount,
        date: new Date(date || Date.now()),
        method,
        notes,
      },
    });

    const newPaid = invoice.paidAmount + amount;
    const status = newPaid >= invoice.amount ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    await prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: newPaid, status },
    });

    await createAuditLog(req.user!.userId, 'create', 'CustomerPayment', payment.id);
    res.status(201).json(payment);
  })
);

export default router;
