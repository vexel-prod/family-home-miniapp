import type { PrismaClient } from '@/generated/prisma/client'
import {
  DEADLINE_PENALTY_DELAY_MS,
  DEADLINE_REMINDER_INTERVAL_MS,
  formatMoscowDeadlineLabel,
  formatPoints,
  getMonthKey,
  getTaskAwardUnits,
  getTaskPenaltyUnits,
} from '@/shared/lib/bonus-shop'
import { getMemberDisplayName, notifyHousehold } from '@/lib/household-notify'

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

export async function clearTaskBonusTransactions(
  prisma: PrismaClient,
  taskId: string,
) {
  await prisma.bonusTransaction.deleteMany({
    where: {
      taskId,
      kind: {
        in: ['task-complete', 'task-complete-together'],
      },
    },
  })
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
  },
  actorMemberId: string,
  together: boolean,
) {
  await clearTaskBonusTransactions(prisma, task.id)

  const monthKey = getMonthKey(task.completedAt)
  const awardUnits = getTaskAwardUnits({
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  })

  if (together) {
    const members = await prisma.member.findMany({
      where: { householdId: task.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    })

    const memberShares = splitUnitsEvenly(
      awardUnits,
      members.map(member => member.id),
    )

    if (!memberShares.length) {
      return
    }

    await prisma.bonusTransaction.createMany({
      data: memberShares.map(share => ({
        householdId: task.householdId,
        memberId: share.memberId,
        taskId: task.id,
        monthKey,
        kind: 'task-complete-together',
        amountUnits: share.units,
        note: `Совместно выполнена задача "${task.title}"`,
      })),
    })

    return
  }

  await prisma.bonusTransaction.create({
    data: {
      householdId: task.householdId,
      memberId: actorMemberId,
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
  now = new Date(),
) {
  const monthKey = getMonthKey(now)
  const aggregate = await prisma.bonusTransaction.aggregate({
    where: {
      memberId,
      monthKey,
    },
    _sum: {
      amountUnits: true,
    },
  })

  return aggregate._sum.amountUnits ?? 0
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
      }

      const memberNames = members.map(getMemberDisplayName).join(', ')

      await notifyHousehold(
        prisma,
        task.householdId,
        `Family Home Mini App\n\n` +
          `Задача просрочена больше чем на час: ${task.title}\n` +
          `Дедлайн был: ${formatMoscowDeadlineLabel(task.deadlineAt)}\n` +
          `Штраф применен ко всем участникам: -${formatPoints(penaltyUnits)} балла суммарно\n` +
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

    await notifyHousehold(
      prisma,
      task.householdId,
      `Family Home Mini App\n\n` +
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

  return prisma.monthlyReport.create({
    data: {
      householdId,
      monthKey,
      title: `Отчет за ${monthKey}`,
      reportBody: lines.join('\n'),
    },
  })
}
