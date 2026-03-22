import { authenticateTelegramRequest } from '@entities/session/server/auth'
import { buildHouseholdMonthReport } from '@entities/bonus/server/bonus-ledger'
import { notifyHousehold } from '@entities/household/server/household-notify'
import { getPrisma } from '@shared/api/prisma'
import { NextResponse } from 'next/server'

function getCurrentMoscowMonthKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value ?? '0000'
  const month = parts.find(part => part.type === 'month')?.value ?? '00'

  return `${year}-${month}`
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth?.member) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const monthKey = getCurrentMoscowMonthKey()
  const report = await buildHouseholdMonthReport(prisma, auth.member.householdId, monthKey)

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n${report.title}\n\n${report.reportBody}`,
  )

  return NextResponse.json({
    ok: true,
    monthKey,
    title: report.title,
  })
}
