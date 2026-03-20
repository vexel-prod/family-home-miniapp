import type { Prisma, PrismaClient } from '@/generated/prisma/client'

type RevisionClient = PrismaClient | Prisma.TransactionClient

export async function bumpHouseholdRevision(prisma: RevisionClient, householdId: string) {
  await prisma.household.update({
    where: {
      id: householdId,
    },
    data: {
      revision: {
        increment: 1,
      },
    },
  })
}
