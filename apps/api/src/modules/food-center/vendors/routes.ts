import { Router } from 'express';
import {
  createVendorSchema,
  createVendorInvoiceSchema,
  vendorPaymentSchema,
  PERMISSIONS,
} from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { upload } from '../../../lib/upload';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.VENDORS_VIEW),
  asyncHandler(async (_req, res) => {
    const vendors = await prisma.vendor.findMany({
      include: {
        invoices: {
          include: { payments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(
      vendors.map((v) => {
        const totalOwed = v.invoices.reduce(
          (sum, inv) => sum + (inv.amount - inv.paidAmount),
          0
        );
        return { ...v, amountOwed: totalOwed };
      })
    );
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.VENDORS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const subsidiary = await prisma.subsidiary.findFirst({
      where: { slug: 'food_center' },
    });
    if (!subsidiary) throw new AppError(404, 'Subsidiary not found');

    const vendor = await prisma.vendor.create({
      data: { ...parsed.data, subsidiaryId: subsidiary.id },
    });

    await createAuditLog(req.user!.userId, 'create', 'Vendor', vendor.id);
    res.status(201).json(vendor);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.VENDORS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await createAuditLog(req.user!.userId, 'update', 'Vendor', vendor.id);
    res.json(vendor);
  })
);

router.post(
  '/:id/invoices',
  authenticate,
  requirePermission(PERMISSIONS.VENDORS_MANAGE),
  upload.single('invoice'),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createVendorInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const invoice = await prisma.vendorInvoice.create({
      data: {
        vendorId: req.params.id,
        ...parsed.data,
        deliveryDate: new Date(parsed.data.deliveryDate),
        fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      },
    });

    await createAuditLog(req.user!.userId, 'create', 'VendorInvoice', invoice.id);
    res.status(201).json(invoice);
  })
);

router.post(
  '/invoices/:invoiceId/payments',
  authenticate,
  requirePermission(PERMISSIONS.VENDORS_MANAGE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = vendorPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const invoice = await prisma.vendorInvoice.findUnique({
      where: { id: req.params.invoiceId },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');

    const payment = await prisma.vendorPayment.create({
      data: {
        invoiceId: invoice.id,
        ...parsed.data,
        date: new Date(parsed.data.date),
      },
    });

    const newPaidAmount = invoice.paidAmount + parsed.data.amount;
    const status =
      newPaidAmount >= invoice.amount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    await prisma.vendorInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: newPaidAmount, status },
    });

    await createAuditLog(req.user!.userId, 'create', 'VendorPayment', payment.id);
    res.status(201).json(payment);
  })
);

export default router;
