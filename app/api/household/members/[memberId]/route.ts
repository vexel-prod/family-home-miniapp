import { authorizeRequest } from '@entities/session/server/auth'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { getPrisma } from '@shared/api/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (auth.member.role !== 'head') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const { memberId } = await context.params

  if (memberId === auth.member.id) {
    return NextResponse.json({ ok: false, error: 'Use leave flow' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      householdId: true,
      isActive: true,
    },
  })

  if (!member || member.householdId !== auth.member.householdId || !member.isActive) {
    return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 })
  }

  await prisma.member.update({
    where: { id: member.id },
    data: {
      isActive: false,
      leftAt: new Date(),
      telegramUserId: null,
      chatId: null,
      role: 'member',
    },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  return NextResponse.json({ ok: true })
}
