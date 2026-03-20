type LogLevel = 'info' | 'warn' | 'error'

type ApiLogPayload = {
  route: string
  method: string
  status: number
  durationMs: number
  userId?: string
  memberId?: string
  householdId?: string
  error?: string
  retryAfterSeconds?: number
  meta?: Record<string, string | number | boolean | undefined | null>
}

export function logApiEvent(level: LogLevel, payload: ApiLogPayload) {
  const record = {
    scope: 'api',
    at: new Date().toISOString(),
    ...payload,
  }

  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
  logger(JSON.stringify(record))
}

export function getElapsedMs(startedAt: number) {
  return Math.max(0, Date.now() - startedAt)
}
