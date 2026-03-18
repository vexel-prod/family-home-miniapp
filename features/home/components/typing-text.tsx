'use client'

import { useEffect, useState } from 'react'

type TypingTextProps = {
  typedText: string
  speed?: number
  className?: string
}

export function TypingText({ typedText, speed = 65, className = '' }: TypingTextProps) {
  const [pos, setPos] = useState(0)
  const [isCaretVisible, setIsCaretVisible] = useState(true)

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
    <div className={['flex flex-col gap-3', className].join(' ')}>
      <div className='w-full flex min-h-12 items-center rounded-md border border-white/15 bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[3px]'>
        <span className='truncate text-sm text-white/90 sm:text-base'>{typedValue}</span>
        <span
          aria-hidden='true'
          className='ml-1 inline-block h-[1.1em] w-px rounded-full bg-white/80 align-middle'
          style={{ opacity: isCaretVisible ? 1 : 0 }}
        />
      </div>
    </div>
  )
}
