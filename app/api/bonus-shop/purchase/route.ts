import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { getMemberProfileSnapshot, syncHouseholdProfiles } from '@/lib/household-profile'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import { BONUS_REWARDS, formatPoints, getMonthKey } from '@/shared/lib/bonus-shop'
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
  const reward = BONUS_REWARDS.find(item => item.key === body.rewardKey)

  if (!reward) {
    return NextResponse.json({ ok: false, error: 'Reward not found' }, { status: 404 })
  }

  const profile = await getMemberProfileSnapshot(prisma, auth.member.id)
  const balanceUnits = profile.bonusBalanceUnits

  if (balanceUnits < reward.costUnits) {
    return NextResponse.json({ ok: false, error: 'Insufficient balance' }, { status: 400 })
  }

  const monthKey = getMonthKey(new Date())

  const purchase = await prisma.bonusPurchase.create({
    data: {
      householdId: auth.member.householdId,
      memberId: auth.member.id,
      monthKey,
      rewardKey: reward.key,
      rewardTitle: reward.title,
      costUnits: reward.costUnits,
    },
  })

  await prisma.bonusTransaction.create({
    data: {
      householdId: auth.member.householdId,
      memberId: auth.member.id,
      purchaseId: purchase.id,
      monthKey,
      kind: 'reward-purchase',
      amountUnits: -reward.costUnits,
      note: `Покупка бонуса "${reward.title}"`,
    },
  })

  await syncHouseholdProfiles(prisma, auth.member.householdId)
  await bumpHouseholdRevision(prisma, auth.member.householdId)

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${auth.member.firstName} купил(а) бонус: ${reward.title}\n` +
      `Стоимость: ${formatPoints(reward.costUnits)} баллов`,
  )

  return NextResponse.json({
    ok: true,
    purchase,
    balanceUnits: (await getMemberProfileSnapshot(prisma, auth.member.id)).bonusBalanceUnits,
  })
}
