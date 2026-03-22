import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { getMemberProfileSnapshot, syncHouseholdProfiles } from '@entities/profile/server/household-profile'
import { notifyHousehold } from '@entities/household/server/household-notify'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import {
  formatPoints,
  fromFamilyRewardKey,
  fromGlobalRewardKey,
  getMonthKey,
  isFamilyRewardKey,
  isGlobalRewardKey,
} from '@entities/bonus'
import { NextResponse } from 'next/server'

type PurchasePayload = {
  rewardKey?: string
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'bonus-purchase',
      scope: auth.member.id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const body = (await request.json().catch(() => ({}))) as PurchasePayload
  const familyRewardId =
    body.rewardKey && isFamilyRewardKey(body.rewardKey) ? fromFamilyRewardKey(body.rewardKey) : null
  const globalRewardId =
    body.rewardKey && isGlobalRewardKey(body.rewardKey) ? fromGlobalRewardKey(body.rewardKey) : null

  const reward = familyRewardId
    ? await prisma.bonusReward.findUnique({
        where: {
          id: familyRewardId,
        },
      })
    : null

  const globalReward = globalRewardId
    ? await prisma.globalBonusReward.findUnique({
        where: {
          id: globalRewardId,
        },
      })
    : null

  const resolvedReward = reward
    ? {
        id: body.rewardKey ?? reward.id,
        title: reward.title,
        costUnits: reward.costUnits,
      }
    : globalReward
      ? {
          id: body.rewardKey ?? globalReward.id,
          title: globalReward.title,
          costUnits: globalReward.costUnits,
        }
      : null

  if (
    (reward && (reward.householdId !== auth.member.householdId || reward.isArchived)) ||
    (globalReward && globalReward.isArchived) ||
    !resolvedReward
  ) {
    return NextResponse.json({ ok: false, error: 'Reward not found' }, { status: 404 })
  }

  const profile = await getMemberProfileSnapshot(prisma, auth.member.id)
  const balanceUnits = profile.bonusBalanceUnits

  if (balanceUnits < resolvedReward.costUnits) {
    return NextResponse.json({ ok: false, error: 'Insufficient balance' }, { status: 400 })
  }

  const monthKey = getMonthKey(new Date())

  const purchase = await prisma.bonusPurchase.create({
    data: {
      householdId: auth.member.householdId,
      memberId: auth.member.id,
      monthKey,
      rewardKey: resolvedReward.id,
      rewardTitle: resolvedReward.title,
      costUnits: resolvedReward.costUnits,
    },
  })

  await prisma.bonusTransaction.create({
    data: {
      householdId: auth.member.householdId,
      memberId: auth.member.id,
      purchaseId: purchase.id,
      monthKey,
      kind: 'reward-purchase',
      amountUnits: -resolvedReward.costUnits,
      note: `Покупка бонуса "${resolvedReward.title}"`,
    },
  })

  await syncHouseholdProfiles(prisma, auth.member.householdId)
  await bumpHouseholdRevision(prisma, auth.member.householdId)

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${auth.member.firstName} купил(а) бонус: ${resolvedReward.title}\n` +
      `Стоимость: ${formatPoints(resolvedReward.costUnits)} HC`,
  )

  return NextResponse.json({
    ok: true,
    purchase,
    balanceUnits: (await getMemberProfileSnapshot(prisma, auth.member.id)).bonusBalanceUnits,
  })
}
