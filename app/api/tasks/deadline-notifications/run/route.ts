import { dispatchDueTaskDeadlineNotifications } from '@entities/household/server/task-deadline-notifications'
import { getPrisma } from '@shared/api/prisma'
import { NextResponse } from 'next/server'

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function handleRun(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = getPrisma()
  const result = await dispatchDueTaskDeadlineNotifications(prisma)

  return NextResponse.json({
    ok: true,
    ...result,
    ranAt: new Date().toISOString(),
  })
}

export async function GET(request: Request) {
  return handleRun(request)
}

export async function POST(request: Request) {
  return handleRun(request)
}
