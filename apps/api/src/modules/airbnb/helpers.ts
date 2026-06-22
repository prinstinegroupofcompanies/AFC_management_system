import { prisma } from '../../lib/prisma';
import { SUBSIDIARIES } from '@agbms/shared';

export async function getAirbnbSubsidiaryId() {
  const sub = await prisma.subsidiary.findFirst({ where: { slug: SUBSIDIARIES.AIRBNB } });
  if (!sub) throw new Error('Atlantic Air BNB subsidiary not found');
  return sub.id;
}

export async function getDefaultPropertyId() {
  const subsidiaryId = await getAirbnbSubsidiaryId();
  const property = await prisma.property.findFirst({ where: { subsidiaryId } });
  if (!property) throw new Error('No property found for Air BNB');
  return property.id;
}
