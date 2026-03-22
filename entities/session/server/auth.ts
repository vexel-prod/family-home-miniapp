import type { PrismaClient } from '@/generated/prisma/client'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export type TelegramAuthUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

type TelegramLoginWidgetUser = TelegramAuthUser & {
  auth_date: number
  hash: string
  photo_url?: string
}

type TelegramSessionPayload = {
  user: TelegramAuthUser
  exp: number
}

export const TELEGRAM_AUTH_COOKIE_NAME = 'household_telegram_session'
const TELEGRAM_AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14
const TELEGRAM_LOGIN_MAX_AGE_SECONDS = 60 * 10

export type AuthorizedMember = {
  member: {
    id: string
    householdId: string
    telegramUserId: string | null
    chatId: string | null
    firstName: string
    lastName: string | null
    username: string | null
    role: string
    isActive: boolean
  }
  user: TelegramAuthUser
}

export type AuthenticatedTelegramUser = {
  user: TelegramAuthUser
  member: AuthorizedMember['member'] | null
}

function getHeaderInitData(request: Request) {
  return request.headers.get('x-telegram-init-data')?.trim() ?? ''
}

function getQueryInitData(request: Request) {
  return new URL(request.url).searchParams.get('initData')?.trim() ?? ''
}

function getSessionSecret() {
  return (
    process.env.TELEGRAM_AUTH_SESSION_SECRET ??
    process.env.AUTH_SESSION_SECRET ??
    process.env.TELEGRAM_BOT_TOKEN ??
    ''
  )
}

function getCookieValue(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get('cookie') ?? ''

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')

    if (rawName !== cookieName) {
      continue
    }

    return rest.join('=')
  }

  return ''
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function buildSignedSessionValue(payload: TelegramSessionPayload) {
  const secret = getSessionSecret()

  if (!secret) {
    throw new Error('Missing TELEGRAM_AUTH_SESSION_SECRET or TELEGRAM_BOT_TOKEN')
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

function parseSignedSessionValue(rawValue: string) {
  const secret = getSessionSecret()

  if (!secret || !rawValue) {
    return null
  }

  const [encodedPayload, rawSignature] = rawValue.split('.')

  if (!encodedPayload || !rawSignature) {
    return null
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url')

  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(rawSignature)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TelegramSessionPayload

    if (!payload.user?.id || !payload.exp || payload.exp <= Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

function validateTelegramInitData(rawInitData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN')
  }

  if (!rawInitData) {
    return null
  }

  const params = new URLSearchParams(rawInitData)
  const hash = params.get('hash')

  if (!hash) {
    return null
  }

  const pairs = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)

  const dataCheckString = pairs.join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  const expectedHash = Buffer.from(computedHash, 'hex')
  const receivedHash = Buffer.from(hash, 'hex')

  if (
    receivedHash.length !== expectedHash.length ||
    !timingSafeEqual(receivedHash, expectedHash)
  ) {
    return null
  }

  const rawUser = params.get('user')

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as TelegramAuthUser
  } catch {
    return null
  }
}

function buildTelegramLoginCheckString(
  payload: Record<string, string | number | undefined>,
  excludeKeys: string[] = [],
) {
  return Object.entries(payload)
    .filter(([key, value]) => !excludeKeys.includes(key) && value !== undefined && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

export function validateTelegramLoginWidgetPayload(payload: Partial<TelegramLoginWidgetUser>) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN')
  }

  if (!payload.id || !payload.auth_date || !payload.hash) {
    return null
  }

  const authAgeSeconds = Math.floor(Date.now() / 1000) - Number(payload.auth_date)

  if (authAgeSeconds < 0 || authAgeSeconds > TELEGRAM_LOGIN_MAX_AGE_SECONDS) {
    return null
  }

  const dataCheckString = buildTelegramLoginCheckString(payload, ['hash'])
  const secretKey = createHash('sha256').update(botToken).digest()
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  const expectedHash = Buffer.from(computedHash, 'hex')
  const receivedHash = Buffer.from(String(payload.hash), 'hex')

  if (
    receivedHash.length !== expectedHash.length ||
    !timingSafeEqual(receivedHash, expectedHash)
  ) {
    return null
  }

  return {
    id: Number(payload.id),
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
  } satisfies TelegramAuthUser
}

export function createTelegramAuthSessionCookie(user: TelegramAuthUser) {
  const expiresAt = Date.now() + TELEGRAM_AUTH_SESSION_TTL_MS

  return {
    name: TELEGRAM_AUTH_COOKIE_NAME,
    value: buildSignedSessionValue({
      user,
      exp: expiresAt,
    }),
    expiresAt,
    maxAgeSeconds: Math.floor(TELEGRAM_AUTH_SESSION_TTL_MS / 1000),
  }
}

export function shouldUseSecureTelegramCookie(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()

  if (forwardedProto) {
    return forwardedProto === 'https'
  }

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

export function readTelegramAuthSession(request: Request) {
  const rawCookie = getCookieValue(request, TELEGRAM_AUTH_COOKIE_NAME)
  return parseSignedSessionValue(rawCookie)?.user ?? null
}

async function resolveAuthenticatedTelegramUser(
  prisma: PrismaClient,
  user: TelegramAuthUser,
): Promise<AuthenticatedTelegramUser | null> {
  if (!user?.id) {
    return null
  }

  const member = await prisma.member.findFirst({
    where: {
      telegramUserId: String(user.id),
      isActive: true,
    },
  })

  if (!member) {
    return {
      user,
      member: null,
    }
  }

  const nextChatId = String(user.id)
  const nextFirstName = user.first_name || member.firstName
  const nextLastName = user.last_name ?? member.lastName
  const nextUsername = user.username ?? member.username

  const shouldUpdateMember =
    member.chatId !== nextChatId ||
    member.firstName !== nextFirstName ||
    member.lastName !== nextLastName ||
    member.username !== nextUsername

  if (!shouldUpdateMember) {
    return {
      user,
      member,
    }
  }

  const updatedMember = await prisma.member.update({
    where: { id: member.id },
    data: {
      chatId: nextChatId,
      firstName: nextFirstName,
      lastName: nextLastName,
      username: nextUsername,
    },
  })

  return {
    user,
    member: updatedMember,
  }
}

export async function authenticateTelegramRequest(
  request: Request,
  prisma: PrismaClient,
): Promise<AuthenticatedTelegramUser | null> {
  const initData = getHeaderInitData(request) || getQueryInitData(request)
  const initDataUser = validateTelegramInitData(initData)

  if (initDataUser?.id) {
    return resolveAuthenticatedTelegramUser(prisma, initDataUser)
  }

  const sessionUser = readTelegramAuthSession(request)

  if (sessionUser?.id) {
    return resolveAuthenticatedTelegramUser(prisma, sessionUser)
  }

  return null
}

export async function authorizeRequest(
  request: Request,
  prisma: PrismaClient,
): Promise<AuthorizedMember | null> {
  const auth = await authenticateTelegramRequest(request, prisma)

  if (!auth?.member) {
    return null
  }

  return auth as AuthorizedMember
}
