import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get(
  '/branches',
  authenticate,
  asyncHandler(async (req, res) => {
    const { subsidiaryId } = req.query;
    const where: Record<string, unknown> = {};
    if (subsidiaryId) where.subsidiaryId = subsidiaryId;

    const branches = await prisma.branch.findMany({
      where,
      include: { subsidiary: { select: { id: true, name: true, slug: true } } },
    });
    res.json(branches);
  })
);

export default router;
