import { getElapsedMs, logApiEvent } from '@shared/api/observability'
import { getPrisma } from '@shared/api/prisma'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readAppVersion() {
  try {
    return (await fs.readFile(join(process.cwd(), 'VERSION'), 'utf8')).trim()
  } catch {
    return 'unknown'
  }
}

export async function GET() {
  const startedAt = Date.now()
  const prisma = getPrisma()

  try {
    const [version] = await Promise.all([
      readAppVersion(),
      prisma.household.findFirst({
        select: { id: true },
      }),
    ])

    const response = NextResponse.json({
      ok: true,
      status: 'healthy',
      version,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      now: new Date().toISOString(),
    })

    logApiEvent('info', {
      route: '/api/health',
      method: 'GET',
      status: 200,
      durationMs: getElapsedMs(startedAt),
    })

    return response
  } catch (error) {
    logApiEvent('error', {
      route: '/api/health',
      method: 'GET',
      status: 503,
      durationMs: getElapsedMs(startedAt),
      error: error instanceof Error ? error.message : 'health-check-failed',
    })

    return NextResponse.json(
      {
        ok: false,
        status: 'unhealthy',
      },
      { status: 503 },
    )
  }
}
