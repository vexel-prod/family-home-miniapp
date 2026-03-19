import { authorizeRequest } from '@/lib/auth'
import { bumpHouseholdRevision } from '@/lib/household-revision'
import { getPrisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const remainingMembers = await prisma.member.findMany({
    where: {
      householdId: auth.member.householdId,
      isActive: true,
      id: {
        not: auth.member.id,
      },
    },
    orderBy: [{ joinedAt: 'asc' }],
    select: {
      id: true,
    },
  })

  await prisma.$transaction(async tx => {
    if (!remainingMembers.length) {
      await tx.household.delete({
        where: {
          id: auth.member.householdId,
        },
      })

      return
    }

    await tx.member.update({
      where: { id: auth.member.id },
      data: {
        isActive: false,
        leftAt: new Date(),
        telegramUserId: null,
        chatId: null,
        role: 'member',
      },
    })

    if (auth.member.role === 'head' && remainingMembers[0]) {
      await tx.member.update({
        where: { id: remainingMembers[0].id },
        data: {
          role: 'head',
        },
      })
    }

    await bumpHouseholdRevision(tx, auth.member.householdId)
  })

  return NextResponse.json({ ok: true })
}
