import { Router } from 'express';
import {
  createInventoryItemSchema,
  inventoryMovementSchema,
  PERMISSIONS,
} from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { pushNotification } from '../../../lib/notifications';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  asyncHandler(async (_req, res) => {
    const items = await prisma.inventoryItem.findMany({
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { productName: 'asc' },
    });
    res.json(items);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createInventoryItemSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const item = await prisma.inventoryItem.create({ data: parsed.data });
    await createAuditLog(req.user!.userId, 'create', 'InventoryItem', item.id);
    res.status(201).json(item);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await createAuditLog(req.user!.userId, 'update', 'InventoryItem', item.id);
    res.json(item);
  })
);

router.get(
  '/movements',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  asyncHandler(async (_req, res) => {
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        item: { select: { id: true, productName: true } },
        staff: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(movements);
  })
);

router.post(
  '/movements',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = inventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const { itemId, type, quantity, notes, staffId } = parsed.data;

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError(404, 'Item not found');

    const needsApproval = type === 'out';
    const movement = await prisma.inventoryMovement.create({
      data: {
        itemId,
        type,
        quantity,
        notes,
        staffId: staffId || req.user!.userId,
        status: needsApproval ? 'pending' : 'approved',
        approvedBy: needsApproval ? undefined : req.user!.userId,
        approvedAt: needsApproval ? undefined : new Date(),
      },
      include: {
        item: { select: { id: true, productName: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    if (!needsApproval) {
      const delta = type === 'in' ? quantity : type === 'out' ? -quantity : quantity;
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: item.quantity + delta },
      });
    }

    await createAuditLog(req.user!.userId, 'create', 'InventoryMovement', movement.id);

    const io = req.app.get('io');
    if (io) io.emit('inventory:updated', { type: 'movement', movement });

    res.status(201).json(movement);
  })
);

router.patch(
  '/movements/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_APPROVE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError(400, 'Status must be approved or rejected');
    }

    const movement = await prisma.inventoryMovement.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });
    if (!movement) throw new AppError(404, 'Movement not found');
    if (movement.status !== 'pending') throw new AppError(400, 'Already processed');

    const updated = await prisma.inventoryMovement.update({
      where: { id: movement.id },
      data: {
        status,
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        item: { select: { id: true, productName: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    if (status === 'approved') {
      const delta =
        movement.type === 'in'
          ? movement.quantity
          : movement.type === 'out'
            ? -movement.quantity
            : movement.quantity;
      await prisma.inventoryItem.update({
        where: { id: movement.itemId },
        data: { quantity: movement.item.quantity + delta },
      });

      const io = req.app.get('io');
      if (io) {
        const item = await prisma.inventoryItem.findUnique({ where: { id: movement.itemId } });
        if (item && item.quantity <= item.reorderLevel) {
          io.emit('inventory:low-stock', { item });
          await pushNotification(io, {
            type: 'inventory',
            title: 'Low Stock Alert',
            message: `${item.productName} is low — ${item.quantity} left (reorder at ${item.reorderLevel})`,
            subsidiarySlug: 'food_center',
            entityType: 'InventoryItem',
            entityId: item.id,
          });
        }
      }
    }

    await createAuditLog(req.user!.userId, status, 'InventoryMovement', movement.id);
    res.json(updated);
  })
);

export default router;
