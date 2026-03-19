import { createMonthlyReportIfNeeded, processTaskDeadlineEvents } from '@/lib/bonus-ledger'
import { notifyHousehold } from '@/lib/household-notify'
import { getPrisma } from '@/lib/prisma'
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
  const expectedSecret = process.env.CRON_SECRET
  const providedSecret = request.headers.get('x-cron-secret')

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const prisma = getPrisma()
  await processTaskDeadlineEvents(prisma)

  if (canSendMonthlyReport()) {
    const households = await prisma.household.findMany({
      select: { id: true },
    })

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
      }
    }
  }

  return NextResponse.json({ ok: true })
}
