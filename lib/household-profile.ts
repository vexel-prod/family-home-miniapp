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
  const [initialMember, recentTaskTransactions] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        experiencePoints: true,
        level: true,
        bonusBalanceUnits: true,
        completedTasksCount: true,
        fastTasksCount: true,
        overdueTasksCount: true,
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
      take: 8,
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
  ])

  if (!initialMember) {
    throw new Error(`Member not found: ${memberId}`)
  }

  let member = initialMember

  const hasTaskHistory = recentTaskTransactions.some((transaction) => Boolean(transaction.task?.completedAt))
  const hasEmptyProgressSnapshot =
    member.completedTasksCount === 0 &&
    member.fastTasksCount === 0 &&
    member.overdueTasksCount === 0
  const hasMissingTotals = member.experiencePoints === 0 && member.bonusBalanceUnits === 0

  // Backfill legacy member snapshots lazily on read when historical task data exists
  // but persisted profile counters were never synchronized.
  if (hasTaskHistory && (hasEmptyProgressSnapshot || hasMissingTotals)) {
    await recalculateMemberProfile(prisma, memberId)

    const refreshedMember = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        experiencePoints: true,
        level: true,
        bonusBalanceUnits: true,
        completedTasksCount: true,
        fastTasksCount: true,
        overdueTasksCount: true,
      },
    })

    if (refreshedMember) {
      member = refreshedMember
    }
  }

  const recentEvents: MemberProfileTaskEvent[] = []

  for (const transaction of recentTaskTransactions) {
    if (!transaction.task?.completedAt) {
      continue
    }

    const { expDelta, variant } = getTaskExpResult(transaction.task)
    recentEvents.push({
      id: transaction.task.id,
      title: transaction.task.title,
      completedAt: transaction.task.completedAt.toISOString(),
      expDelta,
      variant,
    })
  }

  const totalExp = member.experiencePoints
  const currentLevel = member.level
  const levelBonusUnits = getLevelBonusUnits(currentLevel)
  const bonusBalanceUnits = member.bonusBalanceUnits
  const currentLevelThreshold = getLevelThreshold(currentLevel)
  const nextLevel = currentLevel + 1
  const nextLevelThreshold = getLevelThreshold(nextLevel)

  return {
    totalExp,
    currentLevel,
    bonusBalanceUnits,
    currentLevelThreshold,
    nextLevel,
    nextLevelThreshold,
    expIntoCurrentLevel: totalExp - currentLevelThreshold,
    expToNextLevel: nextLevelThreshold - totalExp,
    completedTasksCount: member.completedTasksCount,
    fastTasksCount: member.fastTasksCount,
    overdueTasksCount: member.overdueTasksCount,
    levelBonusUnits,
    recentEvents,
  }
}

async function recalculateMemberProfile(prisma: PrismaClient, memberId: string) {
  const [member, taskTransactions, transactionAggregate] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
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
  let completedTasksCount = 0

  for (const transaction of taskTransactions) {
    if (!transaction.task?.completedAt) {
      continue
    }

    completedTasksCount += 1
    const { expDelta, variant } = getTaskExpResult(transaction.task)
    totalExp += expDelta

    if (variant === 'fast') {
      fastTasksCount += 1
    }

    if (variant === 'overdue') {
      overdueTasksCount += 1
    }
  }

  const currentLevel = getCurrentLevel(totalExp)
  const levelBonusUnits = getLevelBonusUnits(currentLevel)
  const bonusBalanceUnits = (transactionAggregate._sum.amountUnits ?? 0) + levelBonusUnits

  await prisma.member.update({
    where: { id: memberId },
    data: {
      experiencePoints: totalExp,
      level: currentLevel,
      bonusBalanceUnits,
      completedTasksCount,
      fastTasksCount,
      overdueTasksCount,
    },
  })
}

export async function syncHouseholdProfiles(prisma: PrismaClient, householdId: string) {
  const members = await prisma.member.findMany({
    where: {
      householdId,
      isActive: true,
    },
    select: {
      id: true,
    },
  })

  for (const member of members) {
    await recalculateMemberProfile(prisma, member.id)
  }
}
