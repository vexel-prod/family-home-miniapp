import { authenticateTelegramRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { getMemberProfileSnapshot } from '@/lib/household-profile'
import { getHouseholdSummary } from '@/lib/household'
import { getMonthlyLeaderboardStats } from '@/lib/bonus-ledger'
import { getElapsedMs, logApiEvent } from '@/lib/observability'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

function getCurrentMoscowMonthRange() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  })

  const parts = formatter.formatToParts(new Date())
  const year = Number(
    parts.find(part => part.type === 'year')?.value ?? new Date().getUTCFullYear(),
  )
  const month = Number(
    parts.find(part => part.type === 'month')?.value ?? new Date().getUTCMonth() + 1,
  )
  const start = new Date(Date.UTC(year, month - 1, 1, -3))
  const end = new Date(Date.UTC(year, month, 1, -3))

  return { start, end }
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const prisma = getPrisma()
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth) {
    logApiEvent('warn', {
      route: '/api/bootstrap',
      method: 'GET',
      status: 401,
      durationMs: getElapsedMs(startedAt),
    })

    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'bootstrap-load',
      scope: String(auth.user.id),
      limit: 180,
      windowMs: 5 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      logApiEvent('warn', {
        route: '/api/bootstrap',
        method: 'GET',
        status: 429,
        durationMs: getElapsedMs(startedAt),
        userId: String(auth.user.id),
        retryAfterSeconds: error.retryAfterSeconds,
      })

      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  if (!auth.member) {
    const response = NextResponse.json({
      ok: true,
      state: 'onboarding',
    })

    logApiEvent('info', {
      route: '/api/bootstrap',
      method: 'GET',
      status: 200,
      durationMs: getElapsedMs(startedAt),
      userId: String(auth.user.id),
      meta: {
        state: 'onboarding',
      },
    })

    return response
  }

  try {
    const { start, end } = getCurrentMoscowMonthRange()

    const currentUserProfile = await getMemberProfileSnapshot(prisma, auth.member.id)

    const [
      openTasks,
      completedTasks,
      monthlyCompletedTasks,
      activeShoppingItems,
      purchasedShoppingItems,
      monthlyStats,
      bonusRewards,
      householdGoalState,
      familyGoal,
      bonusPurchases,
      monthlyReports,
      household,
    ] = await Promise.all([
      prisma.householdTask.findMany({
        where: { householdId: auth.member.householdId, status: 'open' },
        orderBy: [{ deadlineAt: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.householdTask.findMany({
        where: { householdId: auth.member.householdId, status: 'done' },
        orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      }),
      prisma.householdTask.findMany({
        where: {
          householdId: auth.member.householdId,
          status: 'done',
          completedAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.shoppingItem.findMany({
        where: { householdId: auth.member.householdId, status: 'active' },
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.shoppingItem.findMany({
        where: { householdId: auth.member.householdId, status: 'purchased' },
        orderBy: [{ purchasedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      }),
      getMonthlyLeaderboardStats(prisma, auth.member.householdId),
      prisma.bonusReward.findMany({
        where: {
          householdId: auth.member.householdId,
          isArchived: false,
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      prisma.household.findUnique({
        where: {
          id: auth.member.householdId,
        },
        select: {
          sharedGoalUnits: true,
        },
      }),
      prisma.familyGoal.findFirst({
        where: {
          householdId: auth.member.householdId,
          isActive: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.bonusPurchase.findMany({
        where: {
          householdId: auth.member.householdId,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      }),
      prisma.monthlyReport.findMany({
        where: { householdId: auth.member.householdId },
        orderBy: [{ createdAt: 'desc' }],
        take: 6,
      }),
      getHouseholdSummary(prisma, auth.member.householdId, auth.member.id),
    ])

    const response = NextResponse.json({
      ok: true,
      state: 'active',
      openTasks,
      completedTasks,
      monthlyCompletedTasks,
      participantNames: monthlyStats.participantNames,
      monthlyLeaderboardEntries: monthlyStats.monthlyLeaderboardEntries,
      monthlyTeamBonusPoints: monthlyStats.monthlyTeamBonusPoints,
      currentUserBonusBalanceUnits: currentUserProfile.bonusBalanceUnits,
      currentUserProfile,
      household,
      bonusRewards: bonusRewards.map(reward => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        costUnits: reward.costUnits,
        createdByMemberId: reward.createdByMemberId,
      })),
      familyGoal: familyGoal
        ? {
            id: familyGoal.id,
            kind: familyGoal.kind === 'material' ? 'material' : 'spiritual',
            title: familyGoal.title,
            description: familyGoal.description,
            targetValue: familyGoal.targetValue,
            currentValue:
              familyGoal.kind === 'spiritual'
                ? householdGoalState?.sharedGoalUnits ?? familyGoal.currentValue
                : familyGoal.currentValue,
            unitLabel: familyGoal.unitLabel,
            isCompleted: Boolean(familyGoal.completedAt),
          }
        : null,
      bonusPurchases,
      monthlyReports,
      activeShoppingItems,
      purchasedShoppingItems,
    })

    logApiEvent('info', {
      route: '/api/bootstrap',
      method: 'GET',
      status: 200,
      durationMs: getElapsedMs(startedAt),
      userId: String(auth.user.id),
      memberId: auth.member.id,
      householdId: auth.member.householdId,
      meta: {
        state: 'active',
        openTasks: openTasks.length,
        completedTasks: completedTasks.length,
        shoppingItems: activeShoppingItems.length,
        purchasedShoppingItems: purchasedShoppingItems.length,
      },
    })

    return response
  } catch (error) {
    logApiEvent('error', {
      route: '/api/bootstrap',
      method: 'GET',
      status: 500,
      durationMs: getElapsedMs(startedAt),
      userId: String(auth.user.id),
      memberId: auth.member.id,
      householdId: auth.member.householdId,
      error: error instanceof Error ? error.message : 'bootstrap-failed',
    })

    throw error
  }
}
