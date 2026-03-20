import { NextResponse } from 'next/server'

export function jsonRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many requests', retryAfterSeconds },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  )
}
