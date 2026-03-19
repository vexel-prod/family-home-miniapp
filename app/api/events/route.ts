import { authorizeRequest } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { getHouseholdRevision } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

function createSseMessage(event: string, data: Record<string, string>) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(request: Request) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
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
      }, 5000)

      cleanup = () => {
        clearInterval(heartbeatId)
        clearInterval(pollId)
        closeStream()
      }

      request.signal.addEventListener('abort', cleanup, { once: true })
    },
    cancel() {
      cleanup()
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
