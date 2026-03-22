import { getTelegramBotUsername } from '@shared/api/telegram'
import { getPrisma } from '@shared/api/prisma'
import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'

const BROWSER_LOGIN_TTL_MS = 1000 * 60 * 10
async function createBrowserLoginSession() {
  const prisma = getPrisma()

  await prisma.browserLoginSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return prisma.browserLoginSession.create({
    data: {
      token: randomBytes(24).toString('hex'),
      expiresAt: new Date(Date.now() + BROWSER_LOGIN_TTL_MS),
    },
    select: {
      id: true,
      token: true,
      expiresAt: true,
    },
  })
}

export async function GET() {
  const botUsername = await getTelegramBotUsername().catch(() => '')

  if (!botUsername) {
    return NextResponse.json({ ok: false, error: 'Bot unavailable' }, { status: 503 })
  }

  return NextResponse.json({
    ok: true,
    botUsername,
  })
}

export async function POST() {
  const botUsername = await getTelegramBotUsername().catch(() => '')

  if (!botUsername) {
    return NextResponse.json({ ok: false, error: 'Bot unavailable' }, { status: 503 })
  }

  const session = await createBrowserLoginSession()

  const startParam = `login_${session.token}`
  const loginUrl = `https://t.me/${botUsername}?start=${startParam}`
  const fallbackUrl = `tg://resolve?domain=${botUsername}&start=${startParam}`

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    loginUrl,
    fallbackUrl,
    delivery: 'start-link',
    requiresStart: true,
  })
}
