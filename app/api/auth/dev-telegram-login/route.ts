import {
  createTelegramAuthSessionCookie,
  shouldUseSecureTelegramCookie,
} from '@entities/session/server/auth'
import { NextResponse } from 'next/server'

type DevTelegramLoginPayload = {
  telegramUserId?: string
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as DevTelegramLoginPayload | null
  const telegramUserId = payload?.telegramUserId?.trim()

  if (!telegramUserId || !/^\d+$/.test(telegramUserId)) {
    return NextResponse.json({ ok: false, error: 'Invalid telegramUserId' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const sessionCookie = createTelegramAuthSessionCookie({
    id: Number(telegramUserId),
  })

  response.cookies.set({
    name: sessionCookie.name,
    value: sessionCookie.value,
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureTelegramCookie(request),
    path: '/',
    maxAge: sessionCookie.maxAgeSeconds,
    expires: new Date(sessionCookie.expiresAt),
  })

  return response
}
