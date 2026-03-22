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

function shouldLogApiEvent(level: LogLevel) {
  if (level === 'error' || level === 'warn') {
    return true
  }

  if (process.env.API_LOG_INFO === 'true') {
    return true
  }

  return process.env.NODE_ENV === 'production'
}

export function logApiEvent(level: LogLevel, payload: ApiLogPayload) {
  if (!shouldLogApiEvent(level)) {
    return
  }

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
