import { authorizeRequest } from '@entities/session/server/auth'
import { formatMoscowDeadlineLabel, formatPoints, POINT_UNITS } from '@entities/bonus'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { notifyHousehold } from '@entities/household/server/household-notify'
import {
  syncTaskDeadlineNotificationsBestEffort,
} from '@entities/household/server/task-deadline-notifications'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import {
  sanitizeOptionalText,
  TASK_NOTE_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { isAllowedTaskDeadline } from '@shared/lib/task-deadline'
import { NextResponse } from 'next/server'

type CreateTaskPayload = {
  title?: string
  note?: string | null
  deadlineAt?: string
  assignedMemberId?: string | null
  rewardPoints?: number | null
}

function parseDeadline(deadlineAt?: string) {
  if (!deadlineAt) {
    return null
  }

  const deadline = new Date(deadlineAt)

  if (Number.isNaN(deadline.getTime())) {
    return null
  }

  const now = new Date()

  if (!isAllowedTaskDeadline(deadline, now)) {
    return null
  }

  return deadline
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'task-create',
      scope: auth.member.id,
      limit: 40,
      windowMs: 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const body = (await request.json().catch(() => ({}))) as CreateTaskPayload

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  const title = validateRequiredText(body.title ?? null, TASK_TITLE_MAX_LENGTH)
  const note = sanitizeOptionalText(body.note)
  const rewardPoints =
    body.rewardPoints === null || body.rewardPoints === undefined ? null : Number(body.rewardPoints)

  if (!title) {
    return NextResponse.json({ ok: false, error: 'Missing task data' }, { status: 400 })
  }

  if (note && !validateLength(note, TASK_NOTE_MAX_LENGTH)) {
    return NextResponse.json({ ok: false, error: 'Task note is too long' }, { status: 400 })
  }

  const deadline = parseDeadline(body.deadlineAt)

  if (!deadline) {
    return NextResponse.json({ ok: false, error: 'Invalid deadline' }, { status: 400 })
  }

  if (
    rewardPoints !== null &&
    (!Number.isInteger(rewardPoints) || rewardPoints <= 0 || rewardPoints > 5000)
  ) {
    return NextResponse.json({ ok: false, error: 'Invalid task reward' }, { status: 400 })
  }

  const assignee = body.assignedMemberId
    ? await prisma.member.findFirst({
        where: {
          id: body.assignedMemberId,
          householdId: auth.member.householdId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      })
    : null

  if (body.assignedMemberId && !assignee) {
    return NextResponse.json({ ok: false, error: 'Invalid task assignee' }, { status: 400 })
  }

  if (assignee?.id === auth.member.id) {
    return NextResponse.json(
      { ok: false, error: 'Self-assignment is not allowed' },
      { status: 400 },
    )
  }

  const task = await prisma.householdTask.create({
    data: {
      householdId: auth.member.householdId,
      title,
      note,
      deadlineAt: deadline,
      assignedMemberId: assignee?.id ?? null,
      assignedMemberName:
        assignee
          ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim() ||
            assignee.username ||
            assignee.firstName
          : null,
      rewardUnits: rewardPoints ? rewardPoints * POINT_UNITS : null,
      addedByMemberId: auth.member.id,
      addedByName: actorName,
      addedByUsername: auth.user.username ?? null,
      addedByTelegramId: String(auth.user.id),
    },
  })

  await syncTaskDeadlineNotificationsBestEffort(prisma, task, { dispatchDue: true })
  await bumpHouseholdRevision(prisma, auth.member.householdId)

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${actorName} добавил(а) задачу\n` +
      `Задача: ${task.title}\n` +
      `Сделать до: ${formatMoscowDeadlineLabel(task.deadlineAt)}` +
      `${task.assignedMemberName ? `\nАдресат: ${task.assignedMemberName}` : ''}` +
      `${task.rewardUnits ? `\nНаграда: ${formatPoints(task.rewardUnits)} HC` : ''}` +
      `${task.note ? `\nКомментарий: ${task.note}` : ''}`,
  )

  return NextResponse.json({ ok: true, task })
}
