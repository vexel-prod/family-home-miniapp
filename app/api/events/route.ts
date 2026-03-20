import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { getElapsedMs, logApiEvent } from '@shared/api/observability'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import { getHouseholdRevision } from '@shared/api/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

function createSseMessage(event: string, data: Record<string, string>) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    logApiEvent('warn', {
      route: '/api/events',
      method: 'GET',
      status: 401,
      durationMs: getElapsedMs(startedAt),
    })

    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  }

  try {
    await enforceRateLimit(prisma, {
      action: 'events-connect',
      scope: auth.member.id,
      limit: 30,
      windowMs: 5 * 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      logApiEvent('warn', {
        route: '/api/events',
        method: 'GET',
        status: 429,
        durationMs: getElapsedMs(startedAt),
        userId: String(auth.user.id),
        memberId: auth.member.id,
        householdId: auth.member.householdId,
        retryAfterSeconds: error.retryAfterSeconds,
      })

      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  let cleanup = () => {}

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let currentRevision = ''

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) {
          return
        }

        controller.enqueue(chunk)
      }

      const closeStream = () => {
        if (closed) {
          return
        }

        closed = true
        controller.close()
      }

      const sendRevisionIfChanged = async () => {
        try {
          const revision = await getHouseholdRevision(prisma, auth.member.householdId)

          if (!currentRevision) {
            currentRevision = revision.stamp
            safeEnqueue(
              createSseMessage('ready', {
                revision: revision.stamp,
              }),
            )
            return
          }

          if (revision.stamp !== currentRevision) {
            currentRevision = revision.stamp
            safeEnqueue(
              createSseMessage('household-updated', {
                revision: revision.stamp,
              }),
            )
          }
        } catch {
          safeEnqueue(
            createSseMessage('error', {
              message: 'revision-check-failed',
            }),
          )
        }
      }

      void sendRevisionIfChanged()

      const heartbeatId = setInterval(() => {
        if (closed) {
          return
        }

        safeEnqueue(createSseMessage('ping', { ts: new Date().toISOString() }))
      }, 15000)

      const pollId = setInterval(() => {
        if (closed) {
          return
        }

        void sendRevisionIfChanged()
      }, 10000)

      cleanup = () => {
        clearInterval(heartbeatId)
        clearInterval(pollId)
        logApiEvent('info', {
          route: '/api/events',
          method: 'GET',
          status: 200,
          durationMs: getElapsedMs(startedAt),
          userId: String(auth.user.id),
          memberId: auth.member.id,
          householdId: auth.member.householdId,
          meta: {
            event: 'stream-closed',
          },
        })
        closeStream()
      }

      request.signal.addEventListener('abort', cleanup, { once: true })
    },
    cancel() {
      cleanup()
    },
  })

  logApiEvent('info', {
    route: '/api/events',
    method: 'GET',
    status: 200,
    durationMs: getElapsedMs(startedAt),
    userId: String(auth.user.id),
    memberId: auth.member.id,
    householdId: auth.member.householdId,
    meta: {
      event: 'stream-opened',
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
