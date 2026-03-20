import { authenticateTelegramRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { generateInviteCode, HOUSEHOLD_INVITE_TTL_MS } from '@entities/household/server/household'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import {
  HOUSEHOLD_NAME_MAX_LENGTH,
  validateRequiredText,
} from '@/shared/lib/validation'
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

  try {
    await enforceRateLimit(prisma, {
      action: 'household-create',
      scope: String(auth.user.id),
      limit: 3,
      windowMs: 10 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const body = (await request.json().catch(() => ({}))) as CreateHouseholdPayload
  const fallbackName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    'My Household'
  const householdName =
    validateRequiredText(body.name ?? null, HOUSEHOLD_NAME_MAX_LENGTH) ??
    validateRequiredText(fallbackName, HOUSEHOLD_NAME_MAX_LENGTH)

  if (!householdName) {
    return NextResponse.json({ ok: false, error: 'Invalid household name' }, { status: 400 })
  }

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
