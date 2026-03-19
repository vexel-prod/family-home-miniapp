import { authorizeRequest } from '@/lib/auth'
import { DEADLINE_LIMIT_MS, formatMoscowDeadlineLabel } from '@/shared/lib/bonus-shop'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
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

  const body = (await request.json()) as CreateTaskPayload

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing task data' }, { status: 400 })
  }

  const deadline = parseDeadline(body.deadlineAt)

  if (!deadline) {
    return NextResponse.json({ ok: false, error: 'Invalid deadline' }, { status: 400 })
  }

  const task = await prisma.householdTask.create({
    data: {
      householdId: auth.member.householdId,
      title: body.title.trim(),
      note: body.note?.trim() || null,
      deadlineAt: deadline,
      addedByName: actorName,
      addedByUsername: auth.user.username ?? null,
      addedByTelegramId: String(auth.user.id),
    },
  })

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Family Home Mini App\n\n` +
      `${actorName} добавил(а) задачу\n` +
      `Задача: ${task.title}\n` +
      `Сделать до: ${formatMoscowDeadlineLabel(task.deadlineAt)}${task.note ? `\nКомментарий: ${task.note}` : ''}`,
  )

  return NextResponse.json({ ok: true, task })
}
