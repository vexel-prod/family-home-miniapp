import {
  createTelegramAuthSessionCookie,
  TELEGRAM_AUTH_COOKIE_NAME,
  validateTelegramLoginWidgetPayload,
} from '@entities/session/server/auth'
import { NextResponse } from 'next/server'

type TelegramLoginPayload = {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date?: number
  hash?: string
}

function buildPayloadFromSearchParams(url: URL): TelegramLoginPayload {
  const rawId = url.searchParams.get('id')
  const rawAuthDate = url.searchParams.get('auth_date')

  return {
    id: rawId ? Number(rawId) : undefined,
    first_name: url.searchParams.get('first_name') ?? undefined,
    last_name: url.searchParams.get('last_name') ?? undefined,
    username: url.searchParams.get('username') ?? undefined,
    photo_url: url.searchParams.get('photo_url') ?? undefined,
    auth_date: rawAuthDate ? Number(rawAuthDate) : undefined,
    hash: url.searchParams.get('hash') ?? undefined,
  }
}

function setSessionCookie(
  response: NextResponse,
  sessionCookie: ReturnType<typeof createTelegramAuthSessionCookie>,
) {
  response.cookies.set({
    name: sessionCookie.name,
    value: sessionCookie.value,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: sessionCookie.maxAgeSeconds,
    expires: new Date(sessionCookie.expiresAt),
  })
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as TelegramLoginPayload | null
  const user = validateTelegramLoginWidgetPayload(payload ?? {})

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sessionCookie = createTelegramAuthSessionCookie(user)
  const response = NextResponse.json({
    ok: true,
    user,
  })

  setSessionCookie(response, sessionCookie)

  return response
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const user = validateTelegramLoginWidgetPayload(buildPayloadFromSearchParams(url))
  const redirectUrl = new URL('/', url)

  if (!user) {
    redirectUrl.searchParams.set('telegramAuth', 'failed')
    return NextResponse.redirect(redirectUrl)
  }

  const response = NextResponse.redirect(redirectUrl)
  setSessionCookie(response, createTelegramAuthSessionCookie(user))
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set({
    name: TELEGRAM_AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })

  return response
}
