'use client'

import { useEffect, useState } from 'react'

type DeadlineCountdownProps = {
  deadlineAt: string
}

function formatCountdownParts(diffMs: number) {
  if (diffMs <= 0) {
    return {
      label: 'дедлайн',
      value: '00:00:00',
    }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return {
      label: 'осталось',
      value: `${days}д ${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м`,
    }
  }

  return {
    label: 'осталось',
    value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}

function getCountdownTone(diffMs: number) {
  if (diffMs <= 30 * 60 * 1000) {
    return 'danger'
  }

  if (diffMs <= 3 * 60 * 60 * 1000) {
    return 'warning'
  }

  return 'normal'
}

export function DeadlineCountdown({ deadlineAt }: DeadlineCountdownProps) {
  const deadlineMs = new Date(deadlineAt).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (Number.isNaN(deadlineMs)) {
    return null
  }

  const diffMs = deadlineMs - now
  const tone = getCountdownTone(diffMs)
  const countdown = formatCountdownParts(diffMs)

  return (
    <div
      className={`inline-flex min-w-42 items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${
        tone === 'danger'
          ? 'border-rose-300/18 bg-rose-500/14 text-rose-100 shadow-[0_10px_28px_rgba(244,63,94,0.14)]'
          : tone === 'warning'
            ? 'border-amber-300/18 bg-amber-400/14 text-amber-100 shadow-[0_10px_28px_rgba(251,191,36,0.12)]'
            : 'border-sky-300/18 bg-sky-400/12 text-sky-100 shadow-[0_10px_28px_rgba(56,189,248,0.10)]'
      }`}
    >
      <div className='text-[10px] font-black uppercase tracking-[0.2em] opacity-75'>
        {countdown.label}
      </div>
      <div className='font-(--font-family-heading) text-sm leading-none tracking-[0.08em]'>
        {countdown.value}
      </div>
    </div>
  )
}
