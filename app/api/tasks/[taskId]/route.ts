import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { awardTaskCompletionBonuses, clearTaskBonusTransactions } from '@/lib/bonus-ledger'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { syncHouseholdProfiles } from '@/lib/household-profile'
import { getMemberDisplayName, notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import { DEADLINE_LIMIT_MS, formatMoscowDeadlineLabel } from '@/shared/lib/bonus-shop'
import {
  sanitizeOptionalText,
  TASK_NOTE_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { formatElapsedLabel, formatMoscowDateTime } from '@/lib/partner-notify'
import { NextResponse } from 'next/server'

type UpdateTaskPayload = {
  action?: 'complete' | 'complete-together' | 'reopen' | 'replace'
  actorName?: string
  actorUsername?: string | null
  actorTelegramId?: string | null
  title?: string
  note?: string | null
  deadlineAt?: string
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
  const diffMs = deadline.getTime() - now.getTime()

  if (diffMs <= 0 || diffMs > DEADLINE_LIMIT_MS) {
    return null
  }

  return deadline
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params
  const body = (await request.json().catch(() => ({}))) as UpdateTaskPayload

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  if (!body.action) {
    return NextResponse.json({ ok: false, error: 'Missing update data' }, { status: 400 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: `task-${body.action}`,
      scope: auth.member.id,
      limit: body.action === 'replace' ? 20 : 60,
      windowMs: 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'replace') {
    const title = validateRequiredText(body.title ?? null, TASK_TITLE_MAX_LENGTH)
    const note = sanitizeOptionalText(body.note)

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Missing replacement title' }, { status: 400 })
    }

    if (note && !validateLength(note, TASK_NOTE_MAX_LENGTH)) {
      return NextResponse.json({ ok: false, error: 'Task note is too long' }, { status: 400 })
    }

    const deadline = parseDeadline(body.deadlineAt)

    if (!deadline) {
      return NextResponse.json({ ok: false, error: 'Invalid deadline' }, { status: 400 })
    }

    const updatedTask = await prisma.householdTask.update({
      where: { id: taskId },
      data: {
        title,
        note,
        deadlineAt: deadline,
      },
    })

    await bumpHouseholdRevision(prisma, auth.member.householdId)

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} обновил(а) задачу\n` +
        `Задача: ${updatedTask.title}\n` +
        `Новый дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}${updatedTask.note ? `\nКомментарий: ${updatedTask.note}` : ''}`,
    )

    return NextResponse.json({ ok: true, task: updatedTask })
  }

  const updatedTask = await prisma.householdTask.update({
    where: { id: taskId },
    data:
      body.action === 'complete' || body.action === 'complete-together'
        ? {
            status: 'done',
            completedAt: new Date(),
            completedByName: body.action === 'complete-together' ? 'Сделано вместе' : actorName,
          }
        : {
            status: 'open',
            completedAt: null,
            completedByName: null,
            lastDeadlineReminderAt: null,
          },
  })

  if (body.action === 'complete' || body.action === 'complete-together') {
    await awardTaskCompletionBonuses(
      prisma,
      {
        id: updatedTask.id,
        householdId: updatedTask.householdId,
        title: updatedTask.title,
        createdAt: updatedTask.createdAt,
        completedAt: updatedTask.completedAt ?? new Date(),
        completedByName: updatedTask.completedByName,
      },
      auth.member.id,
      body.action === 'complete-together',
    )

    await syncHouseholdProfiles(prisma, auth.member.householdId)
  }

  if (body.action === 'reopen') {
    await clearTaskBonusTransactions(prisma, updatedTask.id)
    await syncHouseholdProfiles(prisma, auth.member.householdId)
  }

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  if (
    (body.action === 'complete' || body.action === 'complete-together') &&
    updatedTask.completedAt
  ) {
    const members = await prisma.member.findMany({
      where: { householdId: auth.member.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: ${body.action === 'complete-together' ? 'вместе' : actorName}\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt)}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt)}\n` +
        `Участники месяца: ${members.map(getMemberDisplayName).join(', ')}`,
    )
  }

  if (body.action === 'reopen') {
    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} вернул(а) задачу в активный список\n` +
        `Задача: ${updatedTask.title}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}`,
    )
  }

  return NextResponse.json({ ok: true, task: updatedTask })
}

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params

  try {
    await enforceRateLimit(prisma, {
      action: 'task-delete',
      scope: auth.member.id,
      limit: 20,
      windowMs: 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  await clearTaskBonusTransactions(prisma, taskId)
  await syncHouseholdProfiles(prisma, auth.member.householdId)

  await prisma.householdTask.delete({
    where: { id: taskId },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${actorName} удалил(а) задачу\n` +
      `Задача: ${task.title}`,
  )

  return NextResponse.json({ ok: true })
}
