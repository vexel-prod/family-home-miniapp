import { authorizeRequest } from '@/lib/auth'
import {
  createHouseholdInvite,
  getActiveHouseholdInvite,
  HOUSEHOLD_INVITE_TTL_MS,
} from '@/lib/household'
import { getPrisma } from '@/lib/prisma'
import { normalizeInviteCode } from '@/shared/lib/household'
import { NextResponse } from 'next/server'

type CreateInvitePayload = {
  code?: string
}

export async function GET(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const invite = await getActiveHouseholdInvite(prisma, auth.member.householdId)

  return NextResponse.json({
    ok: true,
    invite: invite
      ? {
          code: invite.code,
          expiresAt: invite.expiresAt.toISOString(),
        }
      : null,
  })
}

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (auth.member.role !== 'head') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as CreateInvitePayload
  const customCode = body.code ? normalizeInviteCode(body.code) : ''

  if (body.code && customCode.length < 6) {
    return NextResponse.json({ ok: false, error: 'Invite code too short' }, { status: 400 })
  }

  if (customCode) {
    const existingInvite = await prisma.householdInvite.findUnique({
      where: {
        code: customCode,
      },
      select: {
        id: true,
        householdId: true,
        revokedAt: true,
        expiresAt: true,
      },
    })

    if (
      existingInvite &&
      existingInvite.householdId !== auth.member.householdId &&
      !existingInvite.revokedAt &&
      existingInvite.expiresAt > new Date()
    ) {
      return NextResponse.json({ ok: false, error: 'Invite code already taken' }, { status: 400 })
    }

    await prisma.householdInvite.updateMany({
      where: {
        householdId: auth.member.householdId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        revokedAt: new Date(),
      },
    })

    const invite = await prisma.householdInvite.create({
      data: {
        householdId: auth.member.householdId,
        createdByMemberId: auth.member.id,
        code: customCode,
        expiresAt: new Date(Date.now() + HOUSEHOLD_INVITE_TTL_MS),
      },
    })

    return NextResponse.json({
      ok: true,
      invite: {
        code: invite.code,
        expiresAt: invite.expiresAt.toISOString(),
      },
    })
  }

  const invite = await createHouseholdInvite(prisma, auth.member.householdId, auth.member.id)

  return NextResponse.json({
    ok: true,
    invite: {
      code: invite.code,
      expiresAt: invite.expiresAt.toISOString(),
    },
  })
}
