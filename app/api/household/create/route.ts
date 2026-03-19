import { authenticateTelegramRequest } from '@/lib/auth'
import { generateInviteCode, HOUSEHOLD_INVITE_TTL_MS } from '@/lib/household'
import { getPrisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type CreateHouseholdPayload = {
  name?: string
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (auth.member) {
    return NextResponse.json({ ok: false, error: 'Already in household' }, { status: 400 })
  }

  const body = (await request.json()) as CreateHouseholdPayload
  const householdName =
    body.name?.trim() ||
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    'My Household'

  const member = await prisma.$transaction(async tx => {
    const household = await tx.household.create({
      data: {
        name: householdName,
      },
    })

    const createdMember = await tx.member.create({
      data: {
        householdId: household.id,
        telegramUserId: String(auth.user.id),
        chatId: String(auth.user.id),
        firstName: auth.user.first_name || auth.user.username || 'Telegram user',
        lastName: auth.user.last_name ?? null,
        username: auth.user.username ?? null,
        role: 'head',
      },
    })

    await tx.householdInvite.create({
      data: {
        householdId: household.id,
        createdByMemberId: createdMember.id,
        code: generateInviteCode(),
        expiresAt: new Date(Date.now() + HOUSEHOLD_INVITE_TTL_MS),
      },
    })

    return createdMember
  })

  return NextResponse.json({
    ok: true,
    householdId: member.householdId,
  })
}
