import { authenticateTelegramRequest } from '@entities/session/server/auth'
import { getPrisma } from '@shared/api/prisma'
import { getAppVersion } from '@shared/lib/version'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const prisma = getPrisma()
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const versionKey = await getAppVersion()

  await prisma.releaseNoticeAcknowledgement.upsert({
    where: {
      telegramUserId_versionKey: {
        telegramUserId: String(auth.user.id),
        versionKey,
      },
    },
    update: {
      acknowledgedAt: new Date(),
    },
    create: {
      telegramUserId: String(auth.user.id),
      versionKey,
      acknowledgedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, versionKey })
}
