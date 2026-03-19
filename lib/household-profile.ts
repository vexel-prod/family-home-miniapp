import type { PrismaClient } from '@/generated/prisma/client'
import {
  getCurrentLevel,
  getLevelBonusUnits,
  getLevelThreshold,
  getTaskExpResult,
  type ProfileTaskExpVariant,
} from '@/shared/lib/household-profile'

type MemberProfileTaskEvent = {
  id: string
  title: string
  completedAt: string
  expDelta: number
  variant: ProfileTaskExpVariant
}

export type MemberProfileSnapshot = {
  totalExp: number
  currentLevel: number
  bonusBalanceUnits: number
  currentLevelThreshold: number
  nextLevel: number
  nextLevelThreshold: number
  expIntoCurrentLevel: number
  expToNextLevel: number
  completedTasksCount: number
  fastTasksCount: number
  overdueTasksCount: number
  levelBonusUnits: number
  recentEvents: MemberProfileTaskEvent[]
}

export async function getMemberProfileSnapshot(
  prisma: PrismaClient,
  memberId: string,
): Promise<MemberProfileSnapshot> {
  const [member, taskTransactions, transactionAggregate] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        experiencePoints: true,
        level: true,
        bonusBalanceUnits: true,
      },
    }),
    prisma.bonusTransaction.findMany({
      where: {
        memberId,
        kind: {
          in: ['task-complete', 'task-complete-together'],
        },
        taskId: {
          not: null,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        taskId: true,
        task: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            completedAt: true,
            deadlineAt: true,
          },
        },
      },
    }),
    prisma.bonusTransaction.aggregate({
      where: {
        memberId,
      },
      _sum: {
        amountUnits: true,
      },
    }),
  ])

  if (!member) {
    throw new Error(`Member not found: ${memberId}`)
  }

  let totalExp = 0
  let fastTasksCount = 0
  let overdueTasksCount = 0
  const recentEvents: MemberProfileTaskEvent[] = []

  for (const transaction of taskTransactions) {
    if (!transaction.task?.completedAt) {
      continue
    }

    const { expDelta, variant } = getTaskExpResult(transaction.task)
    totalExp += expDelta

    if (variant === 'fast') {
      fastTasksCount += 1
    }

    if (variant === 'overdue') {
      overdueTasksCount += 1
    }

    if (recentEvents.length < 8) {
      recentEvents.push({
        id: transaction.task.id,
        title: transaction.task.title,
        completedAt: transaction.task.completedAt.toISOString(),
        expDelta,
        variant,
      })
    }
  }

  const currentLevel = getCurrentLevel(totalExp)
  const levelBonusUnits = getLevelBonusUnits(currentLevel)
  const bonusBalanceUnits = (transactionAggregate._sum.amountUnits ?? 0) + levelBonusUnits
  const currentLevelThreshold = getLevelThreshold(currentLevel)
  const nextLevel = currentLevel + 1
  const nextLevelThreshold = getLevelThreshold(nextLevel)

  if (
    member.experiencePoints !== totalExp ||
    member.level !== currentLevel ||
    member.bonusBalanceUnits !== bonusBalanceUnits
  ) {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        experiencePoints: totalExp,
        level: currentLevel,
        bonusBalanceUnits,
      },
    })
  }

  return {
    totalExp,
    currentLevel,
    bonusBalanceUnits,
    currentLevelThreshold,
    nextLevel,
    nextLevelThreshold,
    expIntoCurrentLevel: totalExp - currentLevelThreshold,
    expToNextLevel: nextLevelThreshold - totalExp,
    completedTasksCount: taskTransactions.length,
    fastTasksCount,
    overdueTasksCount,
    levelBonusUnits,
    recentEvents,
  }
}

export async function syncHouseholdProfiles(prisma: PrismaClient, householdId: string) {
  const members = await prisma.member.findMany({
    where: {
      householdId,
    },
    select: {
      id: true,
    },
  })

  for (const member of members) {
    await getMemberProfileSnapshot(prisma, member.id)
  }
}
