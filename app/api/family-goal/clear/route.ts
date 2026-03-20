import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'family-goal-clear',
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

  await prisma.familyGoal.updateMany({
    where: {
      householdId: auth.member.householdId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({ ok: true })
}
