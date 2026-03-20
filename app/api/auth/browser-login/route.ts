import { getTelegramBotUsername, sendTelegramMessage } from '@shared/api/telegram'
import { getPrisma } from '@shared/api/prisma'
import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'

const BROWSER_LOGIN_TTL_MS = 1000 * 60 * 10
const DEV_BROWSER_LOGIN_TELEGRAM_ID = '5133992697'

export async function POST() {
  const prisma = getPrisma()
  const botUsername = await getTelegramBotUsername().catch(() => '')

  if (!botUsername) {
    return NextResponse.json({ ok: false, error: 'Bot unavailable' }, { status: 503 })
  }

  await prisma.browserLoginSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  const session = await prisma.browserLoginSession.create({
    data: {
      token: randomBytes(24).toString('hex'),
      telegramUserId: DEV_BROWSER_LOGIN_TELEGRAM_ID,
      expiresAt: new Date(Date.now() + BROWSER_LOGIN_TTL_MS),
    },
    select: {
      id: true,
      token: true,
    },
  })

  await sendTelegramMessage({
    chatId: DEV_BROWSER_LOGIN_TELEGRAM_ID,
    text: 'Household\n\nНажми кнопку ниже, чтобы подтвердить вход в браузере.',
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: 'Подтвердить',
            callback_data: `browser-login:${session.id}`,
          },
        ],
      ],
    },
  })

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    token: session.token,
    loginUrl: `tg://resolve?domain=${botUsername}`,
    fallbackUrl: `https://t.me/${botUsername}`,
  })
}
