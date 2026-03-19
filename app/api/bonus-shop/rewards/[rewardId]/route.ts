import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

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
