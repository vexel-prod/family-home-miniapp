'use client'

import { useEffect, useState } from 'react'

type TypingTextProps = {
  typedText: string
  speed?: number
  className?: string
}

export function TypingText({ typedText, speed = 75, className = '' }: TypingTextProps) {
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
    <span className={className}>
      {typedValue}
    </span>
  )
}
