import type { Prisma, PrismaClient } from '@/generated/prisma/client'

type GoalClient = PrismaClient | Prisma.TransactionClient

export async function syncActiveSpiritualGoal(prisma: GoalClient, householdId: string) {
  const [household, goal] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: { sharedGoalUnits: true },
    }),
    prisma.familyGoal.findFirst({
      where: {
        householdId,
        isActive: true,
        kind: 'spiritual',
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
  ])

  if (!household || !goal) {
    return
  }

  await prisma.familyGoal.update({
    where: { id: goal.id },
    data: {
      currentValue: household.sharedGoalUnits,
      completedAt: household.sharedGoalUnits >= goal.targetValue ? goal.completedAt ?? new Date() : null,
    },
  })
}
