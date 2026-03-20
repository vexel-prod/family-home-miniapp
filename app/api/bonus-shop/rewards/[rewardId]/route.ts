import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import {
  BONUS_REWARD_DESCRIPTION_MAX_LENGTH,
  BONUS_REWARD_TITLE_MAX_LENGTH,
  sanitizeOptionalText,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type UpdateRewardPayload = {
  title?: string
  description?: string | null
  costPoints?: number
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ rewardId: string }> },
) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'bonus-reward-update',
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

  const { rewardId } = await context.params
  const reward = await prisma.bonusReward.findUnique({
    where: { id: rewardId },
  })

  if (!reward || reward.householdId !== auth.member.householdId || reward.isArchived) {
    return NextResponse.json({ ok: false, error: 'Reward not found' }, { status: 404 })
  }

  if (auth.member.role !== 'head' && reward.createdByMemberId !== auth.member.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as UpdateRewardPayload
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

  const updatedReward = await prisma.bonusReward.update({
    where: { id: reward.id },
    data: {
      title,
      description,
      costUnits: costPoints * 4,
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({
    ok: true,
    reward: {
      id: updatedReward.id,
      title: updatedReward.title,
      description: updatedReward.description,
      costUnits: updatedReward.costUnits,
      createdByMemberId: updatedReward.createdByMemberId,
    },
  })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ rewardId: string }> },
) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'bonus-reward-delete',
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

  const { rewardId } = await context.params
  const reward = await prisma.bonusReward.findUnique({
    where: {
      id: rewardId,
    },
  })

  if (!reward || reward.householdId !== auth.member.householdId || reward.isArchived) {
    return NextResponse.json({ ok: false, error: 'Reward not found' }, { status: 404 })
  }

  if (auth.member.role !== 'head' && reward.createdByMemberId !== auth.member.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.bonusReward.update({
    where: {
      id: reward.id,
    },
    data: {
      isArchived: true,
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({ ok: true })
}
