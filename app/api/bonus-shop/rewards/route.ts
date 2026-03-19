import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import { POINT_UNITS } from '@/shared/lib/bonus-shop'
import {
  BONUS_REWARD_DESCRIPTION_MAX_LENGTH,
  BONUS_REWARD_TITLE_MAX_LENGTH,
  sanitizeOptionalText,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type CreateRewardPayload = {
  title?: string
  description?: string | null
  costPoints?: number
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'bonus-reward-create',
      scope: auth.member.id,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const body = (await request.json().catch(() => ({}))) as CreateRewardPayload
  const title = validateRequiredText(body.title ?? null, BONUS_REWARD_TITLE_MAX_LENGTH)
  const description = sanitizeOptionalText(body.description)
  const costPoints = Number(body.costPoints)

  if (!title) {
    return NextResponse.json({ ok: false, error: 'Invalid reward title' }, { status: 400 })
  }

  if (description && !validateLength(description, BONUS_REWARD_DESCRIPTION_MAX_LENGTH)) {
    return NextResponse.json({ ok: false, error: 'Reward description is too long' }, { status: 400 })
  }

  if (!Number.isInteger(costPoints) || costPoints <= 0 || costPoints > 5000) {
    return NextResponse.json({ ok: false, error: 'Invalid reward cost' }, { status: 400 })
  }

  const reward = await prisma.bonusReward.create({
    data: {
      householdId: auth.member.householdId,
      createdByMemberId: auth.member.id,
      title,
      description,
      costUnits: costPoints * POINT_UNITS,
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({
    ok: true,
    reward: {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      costUnits: reward.costUnits,
      createdByMemberId: reward.createdByMemberId,
    },
  })
}
