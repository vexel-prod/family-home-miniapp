import { authenticateTelegramRequest } from '@/lib/auth'
import { getMemberProfileSnapshot } from '@/lib/household-profile'
import { getHouseholdSummary } from '@/lib/household'
import { getCurrentMemberBalanceUnits, getMonthlyLeaderboardStats } from '@/lib/bonus-ledger'
import { getPrisma } from '@/lib/prisma'
import { getMonthKey } from '@/shared/lib/bonus-shop'
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
  const prisma = getPrisma()
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.member) {
    return NextResponse.json({
      ok: true,
      state: 'onboarding',
    })
  }

  const { start, end } = getCurrentMoscowMonthRange()

  const currentUserProfile = await getMemberProfileSnapshot(prisma, auth.member.id)
  const monthKey = getMonthKey(new Date())

  const [
    openTasks,
    completedTasks,
    monthlyCompletedTasks,
    activeShoppingItems,
    monthlyStats,
    bonusPurchases,
    monthlyReports,
    currentUserBonusBalanceUnits,
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
    getMonthlyLeaderboardStats(prisma, auth.member.householdId),
    prisma.bonusPurchase.findMany({
      where: {
        householdId: auth.member.householdId,
        monthKey,
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.monthlyReport.findMany({
      where: { householdId: auth.member.householdId },
      orderBy: [{ createdAt: 'desc' }],
      take: 6,
    }),
    getCurrentMemberBalanceUnits(prisma, auth.member.id),
    getHouseholdSummary(prisma, auth.member.householdId, auth.member.id),
  ])

  return NextResponse.json({
    ok: true,
    state: 'active',
    openTasks,
    completedTasks,
    monthlyCompletedTasks,
    participantNames: monthlyStats.participantNames,
    monthlyLeaderboardEntries: monthlyStats.monthlyLeaderboardEntries,
    monthlyTeamBonusPoints: monthlyStats.monthlyTeamBonusPoints,
    currentUserBonusBalanceUnits,
    currentUserProfile,
    household,
    bonusPurchases,
    monthlyReports,
    activeShoppingItems,
  })
}
