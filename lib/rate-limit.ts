import type { PrismaClient } from '@/generated/prisma/client'

type RateLimitInput = {
  action: string
  scope: string
  limit: number
  windowMs: number
  blockMs?: number
}

export class RateLimitError extends Error {
  retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded')
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function enforceRateLimit(
  prisma: PrismaClient,
  input: RateLimitInput,
) {
  const now = new Date()
  const key = `${input.action}:${input.scope}`
  const blockMs = input.blockMs ?? input.windowMs

  const existing = await prisma.actionRateLimit.findUnique({
    where: { key },
  })

  if (!existing) {
    await prisma.actionRateLimit.create({
      data: {
        key,
        action: input.action,
        scope: input.scope,
        hits: 1,
        windowStartedAt: now,
      },
    })
    return
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000)),
    )
  }

  const windowExpired = now.getTime() - existing.windowStartedAt.getTime() >= input.windowMs

  if (windowExpired) {
    await prisma.actionRateLimit.update({
      where: { key },
      data: {
        hits: 1,
        windowStartedAt: now,
        blockedUntil: null,
      },
    })
    return
  }

  if (existing.hits >= input.limit) {
    const blockedUntil = new Date(now.getTime() + blockMs)

    await prisma.actionRateLimit.update({
      where: { key },
      data: {
        blockedUntil,
      },
    })

    throw new RateLimitError(Math.max(1, Math.ceil(blockMs / 1000)))
  }

  await prisma.actionRateLimit.update({
    where: { key },
    data: {
      hits: {
        increment: 1,
      },
    },
  })
}
