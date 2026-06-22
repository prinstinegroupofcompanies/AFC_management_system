import { prisma } from '../../lib/prisma';
import { SUBSIDIARIES } from '@agbms/shared';

export async function getStationSubsidiaryId() {
  const sub = await prisma.subsidiary.findFirst({ where: { slug: SUBSIDIARIES.STATION } });
  if (!sub) throw new Error('Atlantic Station subsidiary not found');
  return sub.id;
}

export async function updateAccountBalance(accountId: string, debit: number, credit: number) {
  const delta = debit - credit;
  await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: delta } },
  });
}
