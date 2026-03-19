import type { PrismaClient } from '@/generated/prisma/client'

type HouseholdRevision = {
  stamp: string
}

export async function getHouseholdRevision(
  prisma: PrismaClient,
  householdId: string,
): Promise<HouseholdRevision> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: {
      revision: true,
    },
  })

  return {
    stamp: household ? String(household.revision) : 'missing',
  }
}
