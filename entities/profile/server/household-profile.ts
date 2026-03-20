import type { PrismaClient } from '@/generated/prisma/client'
import {
  getCurrentLevel,
  getLevelThreshold,
  getTaskExpResult,
  type ProfileTaskExpVariant,
} from '@entities/profile/lib/household-profile'

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
  recentEvents: MemberProfileTaskEvent[]
}

export async function getMemberProfileSnapshot(
  prisma: PrismaClient,
  memberId: string,
): Promise<MemberProfileSnapshot> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      householdId: true,
      bonusBalanceUnits: true,
    },
  })

  if (!member) {
    throw new Error(`Member not found: ${memberId}`)
  }

  const [householdSnapshot, recentTasks] = await Promise.all([
    prisma.household.findUnique({
      where: { id: member.householdId },
      select: {
        experiencePoints: true,
        level: true,
        completedTasksCount: true,
        fastTasksCount: true,
        overdueTasksCount: true,
      },
    }),
    prisma.householdTask.findMany({
      where: {
        householdId: member.householdId,
        status: 'done',
        completedAt: {
          not: null,
        },
      },
      orderBy: [{ completedAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        title: true,
        createdAt: true,
        completedAt: true,
        deadlineAt: true,
      },
    }),
  ])

  if (!householdSnapshot) {
    throw new Error(`Household not found for member: ${memberId}`)
  }

  if (
    recentTasks.length > 0 &&
    householdSnapshot.experiencePoints === 0 &&
    householdSnapshot.completedTasksCount === 0
  ) {
    await syncHouseholdProfiles(prisma, member.householdId)

    return getMemberProfileSnapshot(prisma, memberId)
  }

  const recentEvents = recentTasks.flatMap<MemberProfileTaskEvent>(task => {
    if (!task.completedAt) {
      return []
    }

    const { expDelta, variant } = getTaskExpResult(task)

    return [
      {
        id: task.id,
        title: task.title,
        completedAt: task.completedAt.toISOString(),
        expDelta,
        variant,
      },
    ]
  })

  const totalExp = householdSnapshot.experiencePoints
  const currentLevel = householdSnapshot.level
  const currentLevelThreshold = getLevelThreshold(currentLevel)
  const nextLevel = currentLevel + 1
  const nextLevelThreshold = getLevelThreshold(nextLevel)

  return {
    totalExp,
    currentLevel,
    bonusBalanceUnits: member.bonusBalanceUnits,
    currentLevelThreshold,
    nextLevel,
    nextLevelThreshold,
    expIntoCurrentLevel: totalExp - currentLevelThreshold,
    expToNextLevel: nextLevelThreshold - totalExp,
    completedTasksCount: householdSnapshot.completedTasksCount,
    fastTasksCount: householdSnapshot.fastTasksCount,
    overdueTasksCount: householdSnapshot.overdueTasksCount,
    recentEvents,
  }
}

export async function syncHouseholdProfiles(prisma: PrismaClient, householdId: string) {
  const [members, completedTasks, transactions] = await Promise.all([
    prisma.member.findMany({
      where: {
        householdId,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.householdTask.findMany({
      where: {
        householdId,
        status: 'done',
        completedAt: {
          not: null,
        },
      },
      orderBy: [{ completedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        createdAt: true,
        completedAt: true,
        deadlineAt: true,
      },
    }),
    prisma.bonusTransaction.findMany({
      where: {
        householdId,
      },
      select: {
        memberId: true,
        amountUnits: true,
      },
    }),
  ])

  let totalExp = 0
  let fastTasksCount = 0
  let overdueTasksCount = 0
  let completedTasksCount = 0

  for (const task of completedTasks) {
    if (!task.completedAt) {
      continue
    }

    completedTasksCount += 1

    const { expDelta, variant } = getTaskExpResult(task)
    totalExp += expDelta

    if (variant === 'fast') {
      fastTasksCount += 1
    }

    if (variant === 'overdue') {
      overdueTasksCount += 1
    }
  }

  const currentLevel = getCurrentLevel(totalExp)
  const balanceByMemberId = new Map<string, number>()

  for (const transaction of transactions) {
    balanceByMemberId.set(
      transaction.memberId,
      (balanceByMemberId.get(transaction.memberId) ?? 0) + transaction.amountUnits,
    )
  }

  await prisma.$transaction([
    prisma.household.update({
      where: { id: householdId },
      data: {
        experiencePoints: totalExp,
        level: currentLevel,
        completedTasksCount,
        fastTasksCount,
        overdueTasksCount,
      },
    }),
    ...members.map(member =>
      prisma.member.update({
        where: { id: member.id },
        data: {
          bonusBalanceUnits: balanceByMemberId.get(member.id) ?? 0,
        },
      }),
    ),
  ])
}
