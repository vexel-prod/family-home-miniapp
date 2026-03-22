import type { PrismaClient } from '@/generated/prisma/client'
import { syncActiveSpiritualGoal } from '@entities/family-goal/server/family-goal'
import {
  FAST_COMPLETION_WINDOW_MS,
  formatPoints,
  getMonthKey,
  getTaskAwardUnits,
} from '@entities/bonus'
import { getMemberDisplayName } from '@entities/household/server/household-notify'
import { getTaskExpResult } from '@entities/profile/lib/household-profile'

function getCurrentMoscowMonthRange(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = Number(parts.find(part => part.type === 'year')?.value ?? now.getUTCFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? now.getUTCMonth() + 1)
  const start = new Date(Date.UTC(year, month - 1, 1, -3))
  const end = new Date(Date.UTC(year, month, 1, -3))

  return { start, end }
}

function getMoscowMonthRangeByMonthKey(monthKey: string) {
  const [rawYear, rawMonth] = monthKey.split('-')
  const year = Number(rawYear)
  const month = Number(rawMonth)

  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`)
  }

  const start = new Date(Date.UTC(year, month - 1, 1, -3))
  const end = new Date(Date.UTC(year, month, 1, -3))

  return { start, end }
}

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

function getTaskRewardUnits(task: {
  rewardUnits?: number | null
  createdAt: Date
  completedAt: Date
}) {
  if (typeof task.rewardUnits === 'number' && task.rewardUnits > 0) {
    return task.rewardUnits
  }

  return getTaskAwardUnits({
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  })
}

export async function clearTaskBonusTransactions(
  prisma: PrismaClient,
  taskId: string,
) {
  const [task, togetherTransactions] = await Promise.all([
    prisma.householdTask.findUnique({
      where: { id: taskId },
      select: {
        householdId: true,
        createdAt: true,
        completedAt: true,
        rewardUnits: true,
      },
    }),
    prisma.bonusTransaction.findMany({
      where: {
        taskId,
        kind: 'task-complete-together',
      },
      select: {
        id: true,
      },
      take: 1,
    }),
  ])

  await prisma.bonusTransaction.deleteMany({
    where: {
      taskId,
      kind: {
        in: ['task-complete', 'task-complete-together'],
      },
    },
  })

  if (task?.completedAt && togetherTransactions.length) {
    const togetherUnits = getTaskRewardUnits({
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      rewardUnits: task.rewardUnits,
    })

    await prisma.household.update({
      where: { id: task.householdId },
      data: {
        sharedGoalUnits: {
          decrement: togetherUnits,
        },
      },
    })

    await syncActiveSpiritualGoal(prisma, task.householdId)
  }
}

export async function awardTaskCompletionBonuses(
  prisma: PrismaClient,
  task: {
    id: string
    householdId: string
    title: string
    createdAt: Date
    completedAt: Date
    completedByName: string | null
    assignedMemberId?: string | null
    creditedMemberId?: string | null
    rewardUnits?: number | null
  },
  actorMemberId: string,
  together: boolean,
) {
  await clearTaskBonusTransactions(prisma, task.id)

  const monthKey = getMonthKey(task.completedAt)
  const awardUnits = getTaskRewardUnits(task)

  if (together) {
    const members = await prisma.member.findMany({
      where: { householdId: task.householdId, isActive: true },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    })

    if (!members.length) {
      return
    }

    const memberShares = splitUnitsEvenly(
      awardUnits,
      members.map(member => member.id),
    )

    await prisma.$transaction([
      prisma.bonusTransaction.createMany({
        data: memberShares.map(share => ({
          householdId: task.householdId,
          memberId: share.memberId,
          taskId: task.id,
          monthKey,
          kind: 'task-complete-together',
          amountUnits: share.units,
          note: `Совместно выполнена задача "${task.title}"`,
        })),
      }),
      prisma.household.update({
        where: { id: task.householdId },
        data: {
          sharedGoalUnits: {
            increment: awardUnits,
          },
        },
      }),
    ])

    await syncActiveSpiritualGoal(prisma, task.householdId)

    return
  }

  await prisma.bonusTransaction.create({
    data: {
      householdId: task.householdId,
      memberId: task.creditedMemberId ?? task.assignedMemberId ?? actorMemberId,
      taskId: task.id,
      monthKey,
      kind: 'task-complete',
      amountUnits: awardUnits,
      note: `Выполнена задача "${task.title}"`,
    },
  })
}

export async function getCurrentMemberBalanceUnits(
  prisma: PrismaClient,
  memberId: string,
) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      bonusBalanceUnits: true,
    },
  })

  return member?.bonusBalanceUnits ?? 0
}

export async function backfillCurrentMonthTaskBonuses(
  prisma: PrismaClient,
  now = new Date(),
) {
  const { start, end } = getCurrentMoscowMonthRange(now)
  const monthKey = getMonthKey(now)
  const tasks = await prisma.householdTask.findMany({
    where: {
      status: 'done',
      completedAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ completedAt: 'asc' }],
  })

  let createdTransactions = 0

  for (const task of tasks) {
    const existing = await prisma.bonusTransaction.count({
      where: {
        taskId: task.id,
        kind: {
          in: ['task-complete', 'task-complete-together'],
        },
      },
    })

    if (existing > 0 || !task.completedAt || !task.completedByName) {
      continue
    }

    if (task.completedByName === 'Сделано вместе') {
      const members = await prisma.member.findMany({
        where: { householdId: task.householdId, isActive: true },
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true },
      })

      if (members.length) {
        const togetherUnits = getTaskRewardUnits({
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          rewardUnits: task.rewardUnits,
        })

        await prisma.bonusTransaction.createMany({
          data: splitUnitsEvenly(
            togetherUnits,
            members.map(member => member.id),
          ).map(share => ({
            householdId: task.householdId,
            memberId: share.memberId,
            taskId: task.id,
            monthKey,
            kind: 'task-complete-together',
            amountUnits: share.units,
            note: `Backfill: совместно выполнена задача "${task.title}"`,
          })),
        })

        await prisma.household.update({
          where: { id: task.householdId },
          data: {
            sharedGoalUnits: {
              increment: togetherUnits,
            },
          },
        })

        await syncActiveSpiritualGoal(prisma, task.householdId)
        createdTransactions += members.length
      }

      continue
    }

    const members = await prisma.member.findMany({
      where: { householdId: task.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    const matchedMember = members.find(
      member => getMemberDisplayName(member).trim().toLowerCase() === task.completedByName?.trim().toLowerCase(),
    )

    if (!matchedMember) {
      continue
    }

    await prisma.bonusTransaction.create({
      data: {
        householdId: task.householdId,
        memberId: matchedMember.id,
        taskId: task.id,
        monthKey,
        kind: 'task-complete',
        amountUnits: getTaskRewardUnits({
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          rewardUnits: task.rewardUnits,
        }),
        note: `Backfill: выполнена задача "${task.title}"`,
      },
    })

    createdTransactions += 1
  }

  return {
    tasksScanned: tasks.length,
    createdTransactions,
  }
}

export async function getMonthlyLeaderboardStats(
  prisma: PrismaClient,
  householdId: string,
  now = new Date(),
) {
  const { start, end } = getCurrentMoscowMonthRange(now)
  const monthKey = getMonthKey(now)
  const [members, tasks, transactions] = await Promise.all([
    prisma.member.findMany({
      where: { householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    }),
    prisma.householdTask.findMany({
      where: {
        householdId,
        status: 'done',
        completedAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ completedAt: 'desc' }],
    }),
    prisma.bonusTransaction.findMany({
      where: {
        householdId,
        monthKey,
      },
      select: {
        memberId: true,
        taskId: true,
        kind: true,
        amountUnits: true,
      },
    }),
  ])

  const standingsMap = new Map<string, { name: string; points: number; completedCount: number; fastCount: number }>()
  const nameByMemberId = new Map<string, string>()

  for (const member of members) {
    const displayName = getMemberDisplayName(member)
    standingsMap.set(displayName, {
      name: displayName,
      points: 0,
      completedCount: 0,
      fastCount: 0,
    })
    nameByMemberId.set(member.id, displayName)
  }

  const taskById = new Map(tasks.map(task => [task.id, task]))
  const countedTaskMembers = new Set<string>()

  for (const transaction of transactions) {
    if (transaction.kind !== 'task-complete' && transaction.kind !== 'task-complete-together') {
      continue
    }

    const task = transaction.taskId ? taskById.get(transaction.taskId) : null

    if (!task?.completedAt) {
      continue
    }

    const countKey = `${transaction.memberId}:${task.id}`

    if (countedTaskMembers.has(countKey)) {
      continue
    }

    countedTaskMembers.add(countKey)

    const displayName = nameByMemberId.get(transaction.memberId)

    if (!displayName) {
      continue
    }

    const current = standingsMap.get(displayName)

    if (!current) {
      continue
    }

    current.completedCount += 1
    current.points += getTaskExpResult(task).expDelta
    current.fastCount +=
      task.completedAt.getTime() - task.createdAt.getTime() <= FAST_COMPLETION_WINDOW_MS ? 1 : 0
  }

  const teamBonusUnits = transactions
    .filter(transaction => transaction.kind === 'task-complete-together')
    .reduce((sum, transaction) => sum + transaction.amountUnits, 0)

  return {
    participantNames: [...standingsMap.keys()],
    monthlyLeaderboardEntries: [...standingsMap.values()].sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points
      }

      return right.completedCount - left.completedCount
    }),
    monthlyTeamBonusPoints: Number(formatPoints(teamBonusUnits)),
  }
}

export async function buildHouseholdMonthReport(
  prisma: PrismaClient,
  householdId: string,
  monthKey: string,
) {
  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  })

  const { start: monthStart, end: nextMonthStart } = getMoscowMonthRangeByMonthKey(monthKey)

  const [tasks, transactions] = await Promise.all([
    prisma.householdTask.findMany({
      where: {
        householdId,
        status: 'done',
        completedAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      orderBy: [{ completedAt: 'asc' }],
    }),
    prisma.bonusTransaction.findMany({
      where: {
        householdId,
        monthKey,
      },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        memberId: true,
        taskId: true,
        amountUnits: true,
        kind: true,
      },
    }),
  ])

  const lines: string[] = [`Выполнено задач: ${tasks.length}`, '']
  const taskById = new Map(tasks.map(task => [task.id, task]))

  for (const member of members) {
    const memberName = getMemberDisplayName(member)
    const memberTransactions = transactions.filter(transaction => transaction.memberId === member.id)
    const countedTaskIds = new Set<string>()
    let taskCount = 0
    let memberExp = 0

    for (const transaction of memberTransactions) {
      if (transaction.kind !== 'task-complete' && transaction.kind !== 'task-complete-together') {
        continue
      }

      if (!transaction.taskId || countedTaskIds.has(transaction.taskId)) {
        continue
      }

      const task = taskById.get(transaction.taskId)

      if (!task) {
        continue
      }

      countedTaskIds.add(transaction.taskId)
      taskCount += 1
      memberExp += getTaskExpResult(task).expDelta
    }

    const earnedUnits = memberTransactions
      .filter(transaction => transaction.amountUnits > 0)
      .reduce((sum, transaction) => sum + transaction.amountUnits, 0)
    const spentUnits = memberTransactions
      .filter(transaction => transaction.amountUnits < 0)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amountUnits), 0)

    lines.push(
      `${memberName}: выполнено ${taskCount}, exp ${memberExp}, заработано ${formatPoints(
        earnedUnits,
      )}, потрачено ${formatPoints(spentUnits)}`,
    )
  }

  return {
    title: `Отчет за ${monthKey}`,
    reportBody: lines.join('\n'),
  }
}
