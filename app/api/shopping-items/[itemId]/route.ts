import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import {
  sanitizeOptionalText,
  SHOPPING_NOTE_MAX_LENGTH,
  SHOPPING_QUANTITY_MAX_LENGTH,
  SHOPPING_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type UpdateShoppingPayload = {
  action?: 'purchase' | 'restore' | 'replace'
  actorName?: string
  actorUsername?: string | null
  actorTelegramId?: string | null
  title?: string
  urgency?: 'soon' | 'out' | 'without'
  quantityLabel?: string | null
  note?: string | null
}

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { itemId } = await context.params
  const body = (await request.json().catch(() => ({}))) as UpdateShoppingPayload

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  if (!body.action) {
    return NextResponse.json({ ok: false, error: 'Missing update data' }, { status: 400 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: `shopping-${body.action}`,
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

  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    return NextResponse.json({ ok: false, error: 'Shopping item not found' }, { status: 404 })
  }

  if (item.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'replace') {
    const title = validateRequiredText(body.title ?? null, SHOPPING_TITLE_MAX_LENGTH)
    const quantityLabel = sanitizeOptionalText(body.quantityLabel)
    const note = sanitizeOptionalText(body.note)

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Missing replacement title' }, { status: 400 })
    }

    if (quantityLabel && !validateLength(quantityLabel, SHOPPING_QUANTITY_MAX_LENGTH)) {
      return NextResponse.json(
        { ok: false, error: 'Quantity label is too long' },
        { status: 400 },
      )
    }

    if (note && !validateLength(note, SHOPPING_NOTE_MAX_LENGTH)) {
      return NextResponse.json(
        { ok: false, error: 'Shopping note is too long' },
        { status: 400 },
      )
    }

    const updatedItem = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        title,
        urgency: body.urgency === 'out' ? 'out' : body.urgency === 'without' ? 'without' : 'soon',
        quantityLabel,
        note,
      },
    })

    await bumpHouseholdRevision(prisma, auth.member.householdId)

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} обновил(а) покупку\n` +
        `Позиция: ${updatedItem.title}\n` +
        `Статус: ${updatedItem.urgency === 'out' ? 'закончилось' : updatedItem.urgency === 'without' ? 'без срока' : 'заканчивается'}` +
        `${updatedItem.quantityLabel ? `\nКоличество: ${updatedItem.quantityLabel}` : ''}` +
        `${updatedItem.note ? `\nКомментарий: ${updatedItem.note}` : ''}`,
      auth.member.id,
    )

    return NextResponse.json({ ok: true, shoppingItem: updatedItem })
  }

  const updatedItem = await prisma.shoppingItem.update({
    where: { id: itemId },
    data:
      body.action === 'purchase'
        ? {
            status: 'purchased',
            purchasedAt: new Date(),
            purchasedByName: actorName,
          }
        : {
            status: 'active',
            purchasedAt: null,
            purchasedByName: null,
          },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  if (body.action === 'purchase') {
    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} отметил(а) покупку как выполненную\n` +
        `Позиция: ${updatedItem.title}\n` +
        `Статус: куплено`,
      auth.member.id,
    )
  }

  return NextResponse.json({ ok: true, shoppingItem: updatedItem })
}

export async function DELETE(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { itemId } = await context.params

  try {
    await enforceRateLimit(prisma, {
      action: 'shopping-delete',
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

  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    return NextResponse.json({ ok: false, error: 'Shopping item not found' }, { status: 404 })
  }

  if (item.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.shoppingItem.delete({
    where: { id: itemId },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({ ok: true })
}
