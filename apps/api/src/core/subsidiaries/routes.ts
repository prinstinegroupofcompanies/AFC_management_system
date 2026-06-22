import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const subsidiaries = await prisma.subsidiary.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(subsidiaries);
  })
);

export default router;
