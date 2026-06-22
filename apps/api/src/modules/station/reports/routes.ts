import { Router } from 'express';
import { PERMISSIONS } from '@agbms/shared';
import { prisma } from '../../../lib/prisma';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticate, requirePermission } from '../../../middleware/auth';
import { getStationSubsidiaryId } from '../helpers';

const router = Router();

router.get(
  '/trial-balance',
  authenticate,
  requirePermission(PERMISSIONS.FINANCIAL_REPORTS),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const accounts = await prisma.account.findMany({
      where: { subsidiaryId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const trialBalance = accounts.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debit: a.balance > 0 && ['asset', 'expense'].includes(a.type) ? a.balance : 0,
      credit: a.balance > 0 && ['liability', 'equity', 'revenue'].includes(a.type) ? a.balance : a.balance < 0 ? Math.abs(a.balance) : 0,
      balance: a.balance,
    }));

    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

    res.json({ accounts: trialBalance, totalDebit, totalCredit });
  })
);

router.get(
  '/balance-sheet',
  authenticate,
  requirePermission(PERMISSIONS.FINANCIAL_REPORTS),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const accounts = await prisma.account.findMany({
      where: { subsidiaryId, isActive: true },
    });

    const group = (type: string) =>
      accounts.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0);

    const assets = group('asset');
    const liabilities = group('liability');
    const equity = group('equity');

    res.json({
      assets: { total: assets, accounts: accounts.filter((a) => a.type === 'asset') },
      liabilities: { total: liabilities, accounts: accounts.filter((a) => a.type === 'liability') },
      equity: { total: equity, accounts: accounts.filter((a) => a.type === 'equity') },
      totalLiabilitiesAndEquity: liabilities + equity,
    });
  })
);

router.get(
  '/profit-loss',
  authenticate,
  requirePermission(PERMISSIONS.FINANCIAL_REPORTS),
  asyncHandler(async (req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const accounts = await prisma.account.findMany({
      where: { subsidiaryId, isActive: true, type: { in: ['revenue', 'expense'] } },
    });

    const revenue = accounts.filter((a) => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
    const expenses = accounts.filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0);

    res.json({
      revenue,
      expenses,
      netIncome: revenue - expenses,
      revenueAccounts: accounts.filter((a) => a.type === 'revenue'),
      expenseAccounts: accounts.filter((a) => a.type === 'expense'),
    });
  })
);

router.get(
  '/cash-flow',
  authenticate,
  requirePermission(PERMISSIONS.FINANCIAL_REPORTS),
  asyncHandler(async (_req, res) => {
    const subsidiaryId = await getStationSubsidiaryId();
    const [bankAccounts, recentTxns] = await Promise.all([
      prisma.bankAccount.findMany({ where: { subsidiaryId } }),
      prisma.journalTransaction.findMany({
        where: { subsidiaryId },
        include: { lines: { include: { account: true } } },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ]);

    const cashAccounts = await prisma.account.findMany({
      where: { subsidiaryId, type: 'asset', name: { contains: 'Cash' } },
    });

    res.json({
      bankAccounts,
      cashBalance: cashAccounts.reduce((s, a) => s + a.balance, 0) + bankAccounts.reduce((s, b) => s + b.balance, 0),
      recentTransactions: recentTxns,
    });
  })
);

router.get(
  '/general-ledger',
  authenticate,
  requirePermission(PERMISSIONS.FINANCIAL_REPORTS),
  asyncHandler(async (req, res) => {
    const { accountId } = req.query;
    const subsidiaryId = await getStationSubsidiaryId();

    const where: Record<string, unknown> = { subsidiaryId };
    if (accountId) {
      const lines = await prisma.journalLine.findMany({
        where: { accountId: accountId as string },
        include: {
          transaction: true,
          account: { select: { code: true, name: true } },
        },
        orderBy: { transaction: { date: 'desc' } },
      });
      return res.json(lines);
    }

    const transactions = await prisma.journalTransaction.findMany({
      where,
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  })
);

export default router;
