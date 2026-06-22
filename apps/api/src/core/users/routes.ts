import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createUserSchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        subsidiaries: { include: { subsidiary: true } },
        staffProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        role: { id: u.role.id, slug: u.role.slug, name: u.role.name },
        subsidiaries: u.subsidiaries.map((s) => ({
          id: s.subsidiary.id,
          name: s.subsidiary.name,
          slug: s.subsidiary.slug,
        })),
        staffProfile: u.staffProfile,
        createdAt: u.createdAt,
      }))
    );
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0].message);
    }

    const { name, email, password, roleId, subsidiaryIds, department } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Email already exists');

    const tempPassword = password || 'password123';
    const hashed = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        roleId,
        qrCode: uuidv4(),
        subsidiaries: {
          create: subsidiaryIds.map((subsidiaryId) => ({ subsidiaryId })),
        },
        staffProfile: {
          create: { department, hireDate: new Date() },
        },
      },
      include: {
        role: true,
        subsidiaries: { include: { subsidiary: true } },
        staffProfile: true,
      },
    });

    await createAuditLog(req.user!.userId, 'create', 'User', user.id, { email });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subsidiaries: user.subsidiaries.map((s) => s.subsidiary),
      staffProfile: user.staffProfile,
      tempPassword: password ? undefined : tempPassword,
    });
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_UPDATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, roleId, status, subsidiaryIds, department } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (roleId) updateData.roleId = roleId;
    if (status) updateData.status = status;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { role: true, staffProfile: true },
    });

    if (subsidiaryIds) {
      await prisma.userSubsidiary.deleteMany({ where: { userId: user.id } });
      await prisma.userSubsidiary.createMany({
        data: subsidiaryIds.map((subsidiaryId: string) => ({
          userId: user.id,
          subsidiaryId,
        })),
      });
    }

    if (department !== undefined) {
      await prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: { department },
        create: { userId: user.id, department },
      });
    }

    await createAuditLog(req.user!.userId, 'update', 'User', user.id);

    res.json(user);
  })
);

router.get(
  '/roles',
  authenticate,
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(
      roles.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        permissions: JSON.parse(r.permissions),
      }))
    );
  })
);

export default router;
