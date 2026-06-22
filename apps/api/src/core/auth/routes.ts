import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@agbms/shared';
import { prisma } from '../../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { createAuditLog } from '../../lib/audit';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { AuthRequest, authenticate } from '../../middleware/auth';
import type { Permission } from '@agbms/shared';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid credentials format');
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        subsidiaries: { include: { subsidiary: true } },
        staffProfile: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const permissions = JSON.parse(user.role.permissions) as Permission[];
    const subsidiaryIds = user.subsidiaries.map((s) => s.subsidiaryId);

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role.slug,
      permissions,
      subsidiaryIds,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await createAuditLog(user.id, 'login', 'User', user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.slug,
        roleName: user.role.name,
        permissions,
        subsidiaries: user.subsidiaries.map((s) => ({
          id: s.subsidiary.id,
          slug: s.subsidiary.slug,
          name: s.subsidiary.name,
          isActive: s.subsidiary.isActive,
        })),
        qrCode: user.qrCode,
      },
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, 'Refresh token required');

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            role: true,
            subsidiaries: true,
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid refresh token');
    }

    verifyRefreshToken(refreshToken);

    const permissions = JSON.parse(stored.user.role.permissions) as Permission[];
    const payload = {
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role.slug,
      permissions,
      subsidiaryIds: stored.user.subsidiaries.map((s) => s.subsidiaryId),
    };

    res.json({ accessToken: signAccessToken(payload) });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        role: true,
        subsidiaries: { include: { subsidiary: true } },
        staffProfile: true,
      },
    });

    if (!user) throw new AppError(404, 'User not found');

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.slug,
      roleName: user.role.name,
      permissions: JSON.parse(user.role.permissions),
      subsidiaries: user.subsidiaries.map((s) => ({
        id: s.subsidiary.id,
        slug: s.subsidiary.slug,
        name: s.subsidiary.name,
        isActive: s.subsidiary.isActive,
      })),
      qrCode: user.qrCode,
      staffProfile: user.staffProfile,
    });
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    await createAuditLog(req.user!.userId, 'logout', 'User', req.user!.userId);
    res.json({ message: 'Logged out' });
  })
);

export default router;
