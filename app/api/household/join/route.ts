import { authenticateTelegramRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { countActiveHouseholdMembers, MAX_HOUSEHOLD_MEMBERS } from '@entities/household/server/household'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import { normalizeInviteCode } from '@entities/household'
import {
  INVITE_CODE_MAX_LENGTH,
  INVITE_CODE_MIN_LENGTH,
} from '@/shared/lib/validation'
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

  try {
    await enforceRateLimit(prisma, {
      action: 'household-join',
      scope: String(auth.user.id),
      limit: 10,
      windowMs: 10 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const body = (await request.json().catch(() => ({}))) as JoinHouseholdPayload
  const normalizedCode = body.code ? normalizeInviteCode(body.code) : ''

  if (!normalizedCode) {
    return NextResponse.json({ ok: false, error: 'Missing invite code' }, { status: 400 })
  }

  if (
    normalizedCode.length < INVITE_CODE_MIN_LENGTH ||
    normalizedCode.length > INVITE_CODE_MAX_LENGTH
  ) {
    return NextResponse.json({ ok: false, error: 'Invalid invite code' }, { status: 400 })
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

  await bumpHouseholdRevision(prisma, invite.householdId)

  return NextResponse.json({
    ok: true,
    householdId: invite.householdId,
  })
}
