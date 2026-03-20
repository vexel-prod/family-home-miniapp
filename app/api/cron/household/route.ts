import { createMonthlyReportIfNeeded, processTaskDeadlineEvents } from '@entities/bonus/server/bonus-ledger'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { notifyHousehold } from '@entities/household/server/household-notify'
import { getElapsedMs, logApiEvent } from '@shared/api/observability'
import { getPrisma } from '@shared/api/prisma'
import { NextResponse } from 'next/server'

function getPreviousMonthKey(now = new Date()) {
  const date = new Date(now)
  date.setUTCMonth(date.getUTCMonth() - 1)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function canSendMonthlyReport(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    hour: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const day = Number(parts.find(part => part.type === 'day')?.value ?? '0')
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '99')

  return day === 1 && hour === 0
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const expectedSecret = process.env.CRON_SECRET
  const providedSecret = request.headers.get('x-cron-secret')

  if (expectedSecret && providedSecret !== expectedSecret) {
    logApiEvent('warn', {
      route: '/api/cron/household',
      method: 'GET',
      status: 403,
      durationMs: getElapsedMs(startedAt),
    })

    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const prisma = getPrisma()
  try {
    await processTaskDeadlineEvents(prisma)

    let reportsSent = 0
    let householdsScanned = 0

    if (canSendMonthlyReport()) {
      const households = await prisma.household.findMany({
        select: { id: true },
      })

      householdsScanned = households.length
      const previousMonthKey = getPreviousMonthKey()

      for (const household of households) {
        const report = await createMonthlyReportIfNeeded(prisma, household.id, previousMonthKey)

        if (!report.sentAt) {
          await notifyHousehold(
            prisma,
            household.id,
            `Household\n\n${report.title}\n\n${report.reportBody}`,
          )

          await prisma.monthlyReport.update({
            where: { id: report.id },
            data: {
              sentAt: new Date(),
            },
          })

          await bumpHouseholdRevision(prisma, household.id)
          reportsSent += 1
        }
      }
    }

    const response = NextResponse.json({ ok: true })

    logApiEvent('info', {
      route: '/api/cron/household',
      method: 'GET',
      status: 200,
      durationMs: getElapsedMs(startedAt),
      meta: {
        reportsSent,
        householdsScanned,
      },
    })

    return response
  } catch (error) {
    logApiEvent('error', {
      route: '/api/cron/household',
      method: 'GET',
      status: 500,
      durationMs: getElapsedMs(startedAt),
      error: error instanceof Error ? error.message : 'cron-household-failed',
    })

    throw error
  }
}
