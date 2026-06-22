import { Router } from 'express';
import { journalEntrySchema, PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit';
import { asyncHandler, AppError } from '../../../middleware/errorHandler';
import { AuthRequest, authenticate, requirePermission } from '../../../middleware/auth';
import { getStationSubsidiaryId, updateAccountBalance } from '../helpers';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.JOURNAL_VIEW),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const transactions = await prisma.journalTransaction.findMany({
      where: { subsidiaryId },
      include: {
        lines: { include: { account: { select: { id: true, code: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.JOURNAL_CREATE),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = journalEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0].message);

    const { date, description, reference, lines } = parsed.data;
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new AppError(400, 'Debits and credits must balance');
    }

    const subsidiaryId = await getStationSubsidiaryId();

    const transaction = await prisma.$transaction(async (tx) => {
      const txn = await tx.journalTransaction.create({
        data: {
          date: new Date(date),
          description,
          reference,
          subsidiaryId,
          lines: {
            create: lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
        },
      });

      for (const line of lines) {
        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { increment: line.debit - line.credit } },
        });
      }

      return txn;
    });

    await createAuditLog(req.user!.userId, 'create', 'JournalTransaction', transaction.id);
    res.status(201).json(transaction);
  })
);

export default router;
