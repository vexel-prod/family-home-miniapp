import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { notifyHousehold } from '@entities/household/server/household-notify'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import {
  sanitizeOptionalText,
  SHOPPING_NOTE_MAX_LENGTH,
  SHOPPING_QUANTITY_MAX_LENGTH,
  SHOPPING_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type CreateShoppingPayload = {
  title?: string
  urgency?: 'soon' | 'out' | 'without'
  quantityLabel?: string | null
  note?: string | null
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'shopping-create',
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

  const body = (await request.json().catch(() => ({}))) as CreateShoppingPayload
  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  const title = validateRequiredText(body.title ?? null, SHOPPING_TITLE_MAX_LENGTH)
  const quantityLabel = sanitizeOptionalText(body.quantityLabel)
  const note = sanitizeOptionalText(body.note)

  if (!title) {
    return NextResponse.json({ ok: false, error: 'Missing shopping item data' }, { status: 400 })
  }

  if (quantityLabel && !validateLength(quantityLabel, SHOPPING_QUANTITY_MAX_LENGTH)) {
    return NextResponse.json(
      { ok: false, error: 'Quantity label is too long' },
      { status: 400 },
    )
  }

  if (note && !validateLength(note, SHOPPING_NOTE_MAX_LENGTH)) {
    return NextResponse.json({ ok: false, error: 'Shopping note is too long' }, { status: 400 })
  }

  const shoppingItem = await prisma.shoppingItem.create({
    data: {
      householdId: auth.member.householdId,
      title,
      urgency: body.urgency === 'out' ? 'out' : body.urgency === 'without' ? 'without' : 'soon',
      quantityLabel,
      note,
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
      `${actorName} добавил(а) покупку\n` +
      `Позиция: ${shoppingItem.title}\n` +
      `Статус: ${shoppingItem.urgency === 'out' ? 'закончилось' : shoppingItem.urgency === 'without' ? 'без срока' : 'заканчивается'}` +
      `${shoppingItem.quantityLabel ? `\nКоличество: ${shoppingItem.quantityLabel}` : ''}` +
      `${shoppingItem.note ? `\nКомментарий: ${shoppingItem.note}` : ''}`,
  )

  return NextResponse.json({ ok: true, shoppingItem })
}
