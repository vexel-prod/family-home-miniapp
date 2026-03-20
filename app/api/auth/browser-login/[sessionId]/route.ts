import {
  createTelegramAuthSessionCookie,
  TELEGRAM_AUTH_COOKIE_NAME,
} from '@entities/session/server/auth'
import { getPrisma } from '@shared/api/prisma'
import { NextResponse } from 'next/server'

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

function clearSessionCookie(response: NextResponse) {
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
}

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params
  const token = new URL(request.url).searchParams.get('token')?.trim() ?? ''
  const prisma = getPrisma()

  const session = await prisma.browserLoginSession.findUnique({
    where: { id: sessionId },
    select: {
      token: true,
      telegramUserId: true,
      firstName: true,
      lastName: true,
      username: true,
      approvedAt: true,
      expiresAt: true,
    },
  })

  if (!session || session.token !== token) {
    const response = NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    clearSessionCookie(response)
    return response
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ ok: true, status: 'expired' })
  }

  if (!session.approvedAt || !session.telegramUserId) {
    return NextResponse.json({ ok: true, status: 'pending' })
  }

  const response = NextResponse.json({ ok: true, status: 'approved' })
  setSessionCookie(
    response,
    createTelegramAuthSessionCookie({
      id: Number(session.telegramUserId),
      first_name: session.firstName ?? undefined,
      last_name: session.lastName ?? undefined,
      username: session.username ?? undefined,
    }),
  )

  return response
}
