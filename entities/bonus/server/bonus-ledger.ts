import type { PrismaClient } from '@/generated/prisma/client'
import { syncActiveSpiritualGoal } from '@entities/family-goal/server/family-goal'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { syncHouseholdProfiles } from '@entities/profile/server/household-profile'
import {
  DEADLINE_PENALTY_DELAY_MS,
  DEADLINE_REMINDER_INTERVAL_MS,
  FAST_COMPLETION_WINDOW_MS,
  formatMoscowDeadlineLabel,
  formatPoints,
  getMonthKey,
  getTaskAwardUnits,
  getTaskPenaltyUnits,
} from '@entities/bonus'
import { getMemberDisplayName, notifyHousehold } from '@entities/household/server/household-notify'
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

export async function processTaskDeadlineEvents(
  prisma: PrismaClient,
  now = new Date(),
) {
  const overdueTasks = await prisma.householdTask.findMany({
    where: {
      status: 'open',
      deadlineAt: {
        lte: now,
      },
    },
    include: {
      household: true,
    },
    orderBy: [{ deadlineAt: 'asc' }],
  })

  for (const task of overdueTasks) {
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

    const deadlinePassedMs = now.getTime() - task.deadlineAt.getTime()

    if (
      !task.penaltyAppliedAt &&
      deadlinePassedMs >= DEADLINE_PENALTY_DELAY_MS
    ) {
      const penaltyUnits = getTaskPenaltyUnits()
      const memberShares = splitUnitsEvenly(
        penaltyUnits,
        members.map(member => member.id),
      )

      if (memberShares.length) {
        await prisma.$transaction([
          prisma.bonusTransaction.createMany({
            data: memberShares.map(share => ({
              householdId: task.householdId,
              memberId: share.memberId,
              taskId: task.id,
              monthKey: getMonthKey(now),
              kind: 'overdue-penalty',
              amountUnits: -share.units,
              note: `Штраф за просрочку задачи "${task.title}"`,
            })),
          }),
          prisma.householdTask.update({
            where: { id: task.id },
            data: {
              penaltyAppliedAt: now,
              penaltyAppliedUnits: penaltyUnits,
            },
          }),
        ])

        await syncHouseholdProfiles(prisma, task.householdId)
        await bumpHouseholdRevision(prisma, task.householdId)
      }

      const memberNames = members.map(getMemberDisplayName).join(', ')

      await notifyHousehold(
        prisma,
        task.householdId,
        `Household\n\n` +
          `Задача просрочена больше чем на час: ${task.title}\n` +
          `Дедлайн был: ${formatMoscowDeadlineLabel(task.deadlineAt)}\n` +
          `Штраф применен ко всем участникам: -${formatPoints(penaltyUnits)} HC суммарно\n` +
          `Участники: ${memberNames}`,
      )

      continue
    }

    const canSendReminder =
      !task.penaltyAppliedAt &&
      (!task.lastDeadlineReminderAt ||
        now.getTime() - task.lastDeadlineReminderAt.getTime() >= DEADLINE_REMINDER_INTERVAL_MS)

    if (!canSendReminder) {
      continue
    }

    await prisma.householdTask.update({
      where: { id: task.id },
      data: {
        lastDeadlineReminderAt: now,
      },
    })

    await bumpHouseholdRevision(prisma, task.householdId)

    await notifyHousehold(
      prisma,
      task.householdId,
      `Household\n\n` +
        `Горят сроки по задаче: ${task.title}\n` +
        `Нужно завершить до: ${formatMoscowDeadlineLabel(task.deadlineAt)}\n` +
        `Если задача провисит еще час после дедлайна, всем участникам будет начислен штраф.`,
    )
  }
}

export async function createMonthlyReportIfNeeded(
  prisma: PrismaClient,
  householdId: string,
  monthKey: string,
) {
  const existing = await prisma.monthlyReport.findUnique({
    where: {
      householdId_monthKey: {
        householdId,
        monthKey,
      },
    },
  })

  if (existing) {
    return existing
  }

  const members = await prisma.member.findMany({
    where: { householdId },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  })

  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`)
  const nextMonthStart = new Date(monthStart)
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1)

  const tasks = await prisma.householdTask.findMany({
    where: {
      householdId,
      completedAt: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
  })

  const lines: string[] = [`Отчет за ${monthKey}`, '', `Выполнено задач: ${tasks.length}`, '']

  for (const member of members) {
    const memberName = getMemberDisplayName(member)
    const taskCount = tasks.filter(task => task.completedByName === memberName).length
    const earnedAggregate = await prisma.bonusTransaction.aggregate({
      where: {
        memberId: member.id,
        monthKey,
        amountUnits: {
          gt: 0,
        },
      },
      _sum: {
        amountUnits: true,
      },
    })
    const spentAggregate = await prisma.bonusTransaction.aggregate({
      where: {
        memberId: member.id,
        monthKey,
        amountUnits: {
          lt: 0,
        },
      },
      _sum: {
        amountUnits: true,
      },
    })

    lines.push(
      `${memberName}: выполнено ${taskCount}, заработано ${formatPoints(
        earnedAggregate._sum.amountUnits ?? 0,
      )}, потрачено ${formatPoints(Math.abs(spentAggregate._sum.amountUnits ?? 0))}`,
    )
  }

  const report = await prisma.monthlyReport.create({
    data: {
      householdId,
      monthKey,
      title: `Отчет за ${monthKey}`,
      reportBody: lines.join('\n'),
    },
  })

  await bumpHouseholdRevision(prisma, householdId)

  return report
}
