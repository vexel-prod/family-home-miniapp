'use client'

import { useEffect, useState } from 'react'

type TypingTextProps = {
  typedText: string
  speed?: number
  className?: string
}

export function TypingText({ typedText, speed = 65, className = '' }: TypingTextProps) {
  const [pos, setPos] = useState(0)
  const [, setIsCaretVisible] = useState(true)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsCaretVisible(current => !current)
    }, 530)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (pos >= typedText.length) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPos(currentPos => currentPos + 1)
    }, speed)

    return () => window.clearTimeout(timeoutId)
  }, [pos, speed, typedText])

  const typedValue = typedText.slice(0, pos)
  return (
    <div
      className={[
        'max-w-max flex min-h-12 items-center rounded-md border border-white/10 bg-black/10 px-4 py-3 backdrop-blur-md inset-shadow-amber-500',
        className,
      ].join(' ')}
    >
      <span className='text-sm text-white/70 sm:text-base text-shadow-md'>
        {typedValue}
      </span>
    </div>
  )
}
