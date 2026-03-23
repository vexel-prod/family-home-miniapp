import type { PrismaClient } from '@/generated/prisma/client'
import { formatMoscowDeadlineLabel } from '@entities/bonus'
import { notifyHousehold, notifyMember } from '@entities/household/server/household-notify'

const THREE_HOURS_MS = 3 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const THIRTY_MINUTES_MS = 30 * 60 * 1000
const ACTIVE_TASK_STATUSES = new Set(['open', 'pending-approval'])

type DeadlineNotificationKind = 'three-hours' | 'one-hour' | 'thirty-minutes' | 'overdue'

type TaskDeadlineNotificationSource = {
  id: string
  householdId: string
  title: string
  deadlineAt: Date
  status: string
  assignedMemberId: string | null
  assignedMemberName: string | null
}

const MILESTONES: Array<{ kind: Exclude<DeadlineNotificationKind, 'overdue'>; offsetMs: number }> = [
  { kind: 'three-hours', offsetMs: THREE_HOURS_MS },
  { kind: 'one-hour', offsetMs: ONE_HOUR_MS },
  { kind: 'thirty-minutes', offsetMs: THIRTY_MINUTES_MS },
]

function normalizeTask(task: {
  id: string
  householdId: string
  title: string
  deadlineAt: Date | string
  status: string
  assignedMemberId: string | null
  assignedMemberName: string | null
}): TaskDeadlineNotificationSource {
  return {
    id: task.id,
    householdId: task.householdId,
    title: task.title,
    deadlineAt: new Date(task.deadlineAt),
    status: task.status,
    assignedMemberId: task.assignedMemberId,
    assignedMemberName: task.assignedMemberName,
  }
}

function getImmediateKind(deadlineAt: Date, now: Date): DeadlineNotificationKind | null {
  const remainingMs = deadlineAt.getTime() - now.getTime()

  if (remainingMs <= 0) {
    return 'overdue'
  }

  if (remainingMs <= THIRTY_MINUTES_MS) {
    return 'thirty-minutes'
  }

  if (remainingMs <= ONE_HOUR_MS) {
    return 'one-hour'
  }

  if (remainingMs <= THREE_HOURS_MS) {
    return 'three-hours'
  }

  return null
}

function buildTaskDeadlineMessage(
  task: TaskDeadlineNotificationSource,
  kind: DeadlineNotificationKind,
) {
  const deadlineLabel = formatMoscowDeadlineLabel(task.deadlineAt)
  const assigneeLine = task.assignedMemberName ? `\nОтветственный: ${task.assignedMemberName}` : ''

  if (kind === 'overdue') {
    return (
      `Household\n\n` +
      `Просрочена задача\n` +
      `Задача: ${task.title}\n` +
      `Дедлайн был: ${deadlineLabel}` +
      assigneeLine
    )
  }

  const lead =
    kind === 'three-hours'
      ? 'До дедлайна осталось меньше 3 часов.'
      : kind === 'one-hour'
        ? 'До дедлайна остался 1 час.'
        : 'До дедлайна осталось меньше 30 минут.'

  return (
    `Household\n\n` +
    `Напоминание о дедлайне\n` +
    `Задача: ${task.title}\n` +
    `${lead}\n` +
    `Сделать до: ${deadlineLabel}` +
    assigneeLine
  )
}

export async function rebuildTaskDeadlineNotifications(
  prisma: PrismaClient,
  rawTask: {
    id: string
    householdId: string
    title: string
    deadlineAt: Date | string
    status: string
    assignedMemberId: string | null
    assignedMemberName: string | null
  },
  now = new Date(),
) {
  const task = normalizeTask(rawTask)

  await prisma.taskDeadlineNotification.deleteMany({
    where: {
      taskId: task.id,
    },
  })

  if (!ACTIVE_TASK_STATUSES.has(task.status)) {
    return
  }

  const memberIds = task.assignedMemberId ? [task.assignedMemberId] : [null]
  const notifications: Array<{
    taskId: string
    householdId: string
    memberId: string | null
    kind: DeadlineNotificationKind
    scheduledFor: Date
  }> = []

  for (const memberId of memberIds) {
    for (const milestone of MILESTONES) {
      const scheduledFor = new Date(task.deadlineAt.getTime() - milestone.offsetMs)

      if (scheduledFor.getTime() > now.getTime()) {
        notifications.push({
          taskId: task.id,
          householdId: task.householdId,
          memberId,
          kind: milestone.kind,
          scheduledFor,
        })
      }
    }

    if (task.deadlineAt.getTime() > now.getTime()) {
      notifications.push({
        taskId: task.id,
        householdId: task.householdId,
        memberId,
        kind: 'overdue',
        scheduledFor: task.deadlineAt,
      })
    }

    const immediateKind = getImmediateKind(task.deadlineAt, now)

    if (immediateKind) {
      notifications.push({
        taskId: task.id,
        householdId: task.householdId,
        memberId,
        kind: immediateKind,
        scheduledFor: now,
      })
    }
  }

  const deduped = new Map<string, (typeof notifications)[number]>()

  for (const notification of notifications) {
    const key = `${notification.taskId}:${notification.kind}:${notification.memberId ?? 'household'}`
    const existing = deduped.get(key)

    if (!existing || existing.scheduledFor.getTime() > notification.scheduledFor.getTime()) {
      deduped.set(key, notification)
    }
  }

  if (deduped.size === 0) {
    return
  }

  await prisma.taskDeadlineNotification.createMany({
    data: [...deduped.values()],
  })
}

export async function dispatchDueTaskDeadlineNotifications(
  prisma: PrismaClient,
  now = new Date(),
  limit = 100,
) {
  const dueNotifications = await prisma.taskDeadlineNotification.findMany({
    where: {
      sentAt: null,
      canceledAt: null,
      scheduledFor: {
        lte: now,
      },
    },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    include: {
      task: {
        select: {
          id: true,
          householdId: true,
          title: true,
          deadlineAt: true,
          status: true,
          assignedMemberId: true,
          assignedMemberName: true,
        },
      },
    },
  })

  let sentCount = 0
  let canceledCount = 0

  for (const notification of dueNotifications) {
    const task = notification.task

    if (!task || !ACTIVE_TASK_STATUSES.has(task.status)) {
      await prisma.taskDeadlineNotification.update({
        where: { id: notification.id },
        data: { canceledAt: now },
      })
      canceledCount += 1
      continue
    }

    const normalizedTask = normalizeTask(task)
    const message = buildTaskDeadlineMessage(normalizedTask, notification.kind as DeadlineNotificationKind)

    if (notification.memberId) {
      await notifyMember(prisma, notification.memberId, message).catch(() => null)

      if (notification.kind === 'overdue') {
        await notifyHousehold(
          prisma,
          normalizedTask.householdId,
          message,
          notification.memberId,
        ).catch(() => null)
      }
    } else {
      await notifyHousehold(prisma, normalizedTask.householdId, message).catch(() => null)
    }

    await prisma.taskDeadlineNotification.update({
      where: { id: notification.id },
      data: { sentAt: now },
    })

    sentCount += 1
  }

  return {
    checked: dueNotifications.length,
    sent: sentCount,
    canceled: canceledCount,
  }
}
