import { authenticateTelegramRequest } from '@/lib/auth'
import { countActiveHouseholdMembers, MAX_HOUSEHOLD_MEMBERS } from '@/lib/household'
import { getPrisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type JoinHouseholdPayload = {
  code?: string
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

  const body = (await request.json()) as JoinHouseholdPayload
  const normalizedCode = body.code?.trim().toUpperCase()

  if (!normalizedCode) {
    return NextResponse.json({ ok: false, error: 'Missing invite code' }, { status: 400 })
  }

  const invite = await prisma.householdInvite.findUnique({
    where: {
      code: normalizedCode,
    },
  })

  if (!invite) {
    return NextResponse.json({ ok: false, error: 'Invite not found' }, { status: 404 })
  }

  if (invite.revokedAt) {
    return NextResponse.json({ ok: false, error: 'Invite revoked' }, { status: 400 })
  }

  if (invite.expiresAt <= new Date()) {
    return NextResponse.json({ ok: false, error: 'Invite expired' }, { status: 400 })
  }

  const activeMembersCount = await countActiveHouseholdMembers(prisma, invite.householdId)

  if (activeMembersCount >= MAX_HOUSEHOLD_MEMBERS) {
    return NextResponse.json({ ok: false, error: 'Household is full' }, { status: 400 })
  }

  await prisma.member.create({
    data: {
      householdId: invite.householdId,
      telegramUserId: String(auth.user.id),
      chatId: String(auth.user.id),
      firstName: auth.user.first_name || auth.user.username || 'Telegram user',
      lastName: auth.user.last_name ?? null,
      username: auth.user.username ?? null,
      role: 'member',
    },
  })

  return NextResponse.json({
    ok: true,
    householdId: invite.householdId,
  })
}
