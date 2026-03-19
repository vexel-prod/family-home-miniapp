import { authorizeRequest } from '@/lib/auth'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
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

  const body = (await request.json()) as CreateShoppingPayload
  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing shopping item data' }, { status: 400 })
  }

  const shoppingItem = await prisma.shoppingItem.create({
    data: {
      householdId: auth.member.householdId,
      title: body.title.trim(),
      urgency: body.urgency === 'out' ? 'out' : body.urgency === 'without' ? 'without' : 'soon',
      quantityLabel: body.quantityLabel?.trim() || null,
      note: body.note?.trim() || null,
      addedByName: actorName,
      addedByUsername: auth.user.username ?? null,
      addedByTelegramId: String(auth.user.id),
    },
  })

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${actorName} добавил(а) покупку\n` +
      `Позиция: ${shoppingItem.title}\n` +
      `Статус: ${shoppingItem.urgency === 'out' ? 'закончилось' : shoppingItem.urgency === 'without' ? 'без срока' : 'заканчивается'}` +
      `${shoppingItem.quantityLabel ? `\nКоличество: ${shoppingItem.quantityLabel}` : ''}` +
      `${shoppingItem.note ? `\nКомментарий: ${shoppingItem.note}` : ''}`,
    auth.member.id,
  )

  return NextResponse.json({ ok: true, shoppingItem })
}
