import { authorizeRequest } from '@/lib/auth'
import { jsonRateLimited } from '@/lib/api-response'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { getPrisma } from '@/lib/prisma'
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit'
import {
  FAMILY_GOAL_DESCRIPTION_MAX_LENGTH,
  FAMILY_GOAL_TITLE_MAX_LENGTH,
  FAMILY_GOAL_UNIT_LABEL_MAX_LENGTH,
  sanitizeOptionalText,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { NextResponse } from 'next/server'

type UpsertFamilyGoalPayload = {
  kind?: 'spiritual' | 'material'
  title?: string
  description?: string | null
  targetValue?: number
  currentValue?: number
  unitLabel?: string | null
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'family-goal-upsert',
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

  const body = (await request.json().catch(() => ({}))) as UpsertFamilyGoalPayload
  const kind = body.kind === 'material' ? 'material' : body.kind === 'spiritual' ? 'spiritual' : null
  const title = validateRequiredText(body.title ?? null, FAMILY_GOAL_TITLE_MAX_LENGTH)
  const description = sanitizeOptionalText(body.description)
  const unitLabel = sanitizeOptionalText(body.unitLabel)
  const targetValue = Number(body.targetValue)
  const currentValue = Number(body.currentValue ?? 0)

  if (!kind) {
    return NextResponse.json({ ok: false, error: 'Invalid family goal kind' }, { status: 400 })
  }

  if (!title) {
    return NextResponse.json({ ok: false, error: 'Invalid family goal title' }, { status: 400 })
  }

  if (description && !validateLength(description, FAMILY_GOAL_DESCRIPTION_MAX_LENGTH)) {
    return NextResponse.json(
      { ok: false, error: 'Family goal description is too long' },
      { status: 400 },
    )
  }

  if (unitLabel && !validateLength(unitLabel, FAMILY_GOAL_UNIT_LABEL_MAX_LENGTH)) {
    return NextResponse.json({ ok: false, error: 'Family goal unit is too long' }, { status: 400 })
  }

  if (!Number.isInteger(targetValue) || targetValue <= 0 || targetValue > 1000000000) {
    return NextResponse.json({ ok: false, error: 'Invalid family goal target' }, { status: 400 })
  }

  if (!Number.isInteger(currentValue) || currentValue < 0 || currentValue > targetValue) {
    return NextResponse.json({ ok: false, error: 'Invalid family goal progress' }, { status: 400 })
  }

  if (kind === 'spiritual' && unitLabel) {
    return NextResponse.json(
      { ok: false, error: 'Spiritual goal does not support custom unit' },
      { status: 400 },
    )
  }

  const existingGoal = await prisma.familyGoal.findFirst({
    where: {
      householdId: auth.member.householdId,
      isActive: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const household = kind === 'spiritual'
    ? await prisma.household.findUnique({
        where: { id: auth.member.householdId },
        select: { sharedGoalUnits: true },
      })
    : null
  const resolvedCurrentValue =
    kind === 'spiritual' ? household?.sharedGoalUnits ?? 0 : currentValue
  const completedAt = resolvedCurrentValue >= targetValue ? new Date() : null

  const goal = existingGoal
    ? await prisma.familyGoal.update({
        where: { id: existingGoal.id },
        data: {
          kind,
          title,
          description,
          targetValue,
          currentValue: resolvedCurrentValue,
          unitLabel: kind === 'material' ? unitLabel ?? existingGoal.unitLabel ?? '₽' : null,
          completedAt,
        },
      })
    : await prisma.familyGoal.create({
        data: {
          householdId: auth.member.householdId,
          createdByMemberId: auth.member.id,
          kind,
          title,
          description,
          targetValue,
          currentValue: resolvedCurrentValue,
          unitLabel: kind === 'material' ? unitLabel ?? '₽' : null,
          completedAt,
        },
      })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({
    ok: true,
    familyGoal: {
      id: goal.id,
      kind: goal.kind === 'material' ? 'material' : 'spiritual',
      title: goal.title,
      description: goal.description,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unitLabel: goal.unitLabel,
      isCompleted: Boolean(goal.completedAt),
    },
  })
}
