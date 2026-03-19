import { authorizeRequest } from '@/lib/auth'
import { DEADLINE_LIMIT_MS, formatMoscowDeadlineLabel } from '@/shared/lib/bonus-shop'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import {
  sanitizeOptionalText,
  TASK_NOTE_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type CreateTaskPayload = {
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

  const task = await prisma.householdTask.create({
    data: {
      householdId: auth.member.householdId,
      title,
      note,
      deadlineAt: deadline,
      addedByName: actorName,
      addedByUsername: auth.user.username ?? null,
      addedByTelegramId: String(auth.user.id),
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${actorName} добавил(а) задачу\n` +
      `Задача: ${task.title}\n` +
      `Сделать до: ${formatMoscowDeadlineLabel(task.deadlineAt)}${task.note ? `\nКомментарий: ${task.note}` : ''}`,
  )

  return NextResponse.json({ ok: true, task })
}
