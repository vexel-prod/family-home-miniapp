import type { PrismaClient } from '@/generated/prisma/client'
import { POINT_UNITS, getMonthKey } from '@entities/bonus'
import { notifyHousehold } from '@entities/household/server/household-notify'
import {
  getCurrentLevel,
  getLevelThreshold,
  getTaskExpResult,
  type ProfileTaskExpVariant,
} from '@entities/profile/lib/household-profile'

const LEVEL_REWARD_HC_PER_LEVEL = 5

function splitUnitsEvenly(totalUnits: number, memberIds: string[]) {
  if (memberIds.length === 0) {
    return []
  }

  const baseShare = Math.floor(totalUnits / memberIds.length)
  let remainder = totalUnits % memberIds.length

  return memberIds.map(memberId => {
    const share = baseShare + (remainder > 0 ? 1 : 0)
    remainder = Math.max(0, remainder - 1)

    return { memberId, units: share }
  })
}

function getHouseholdLevelRewardUnits(level: number) {
  return level * LEVEL_REWARD_HC_PER_LEVEL * POINT_UNITS
}

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
  const [members, completedTasks, transactions, householdSnapshot] = await Promise.all([
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
    prisma.household.findUnique({
      where: { id: householdId },
      select: {
        name: true,
        rewardedLevel: true,
      },
    }),
  ])

  if (!householdSnapshot) {
    throw new Error(`Household not found: ${householdId}`)
  }

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

  totalExp = Math.max(0, totalExp)

  const currentLevel = getCurrentLevel(totalExp)
  const balanceByMemberId = new Map<string, number>()

  for (const transaction of transactions) {
    balanceByMemberId.set(
      transaction.memberId,
      (balanceByMemberId.get(transaction.memberId) ?? 0) + transaction.amountUnits,
    )
  }

  const levelsToReward =
    currentLevel > householdSnapshot.rewardedLevel
      ? Array.from(
          { length: currentLevel - householdSnapshot.rewardedLevel },
          (_, index) => householdSnapshot.rewardedLevel + index + 1,
        )
      : []

  const levelRewardTransactions = levelsToReward.flatMap(level => {
    const rewardUnits = getHouseholdLevelRewardUnits(level)
    const monthKey = getMonthKey(new Date())
    const memberShares = splitUnitsEvenly(
      rewardUnits,
      members.map(member => member.id),
    )

    return memberShares.map(share => ({
      householdId,
      memberId: share.memberId,
      monthKey,
      kind: 'household-level-up',
      amountUnits: share.units,
      note: `Награда за уровень семьи ${level}`,
    }))
  })

  for (const transaction of levelRewardTransactions) {
    balanceByMemberId.set(
      transaction.memberId,
      (balanceByMemberId.get(transaction.memberId) ?? 0) + transaction.amountUnits,
    )
  }

  await prisma.$transaction([
    ...(levelRewardTransactions.length
      ? [
          prisma.bonusTransaction.createMany({
            data: levelRewardTransactions,
          }),
        ]
      : []),
    prisma.household.update({
      where: { id: householdId },
      data: {
        experiencePoints: totalExp,
        level: currentLevel,
        rewardedLevel: Math.max(householdSnapshot.rewardedLevel, currentLevel),
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

  if (levelsToReward.length > 0) {
    const rewardLines = levelsToReward.map(level => {
      const rewardUnits = getHouseholdLevelRewardUnits(level)
      return `Уровень ${level} — ${rewardUnits / POINT_UNITS} HC`
    })

    await notifyHousehold(
      prisma,
      householdId,
      'Household\n\n' +
        `Семья "${householdSnapshot.name}" получила награду за уровень.\n` +
        `${rewardLines.join('\n')}\n\n` +
        'HC уже начислены всем активным участникам.',
    )
  }
}
