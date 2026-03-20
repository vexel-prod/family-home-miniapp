'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type ModalProps = {
  children: ReactNode
  className?: string
}

export function ModalOverlay({ children, className }: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [])

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex w-full items-center justify-center overflow-hidden overscroll-none bg-black/65 p-4 backdrop-blur-md sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function ModalPanel({ children, className }: ModalProps) {
  const classNames = [
    'relative flex max-h-[min(100dvh-5.5rem,56rem)] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-white/10 bg-(--color-panel) text-[var(--color-panel-text)] shadow-2xl',
    className,
  ]

  return (
    <motion.div
      initial={modalReveal.initial}
      animate={modalReveal.animate}
      transition={modalReveal.transition}
      className={classNames.filter(Boolean).join(' ')}
    >
      {children}
    </motion.div>
  )
}

export function ModalHeader({ children, className }: ModalProps) {
  return (
    <div className={['flex-none border-b border-white/10 p-4 sm:p-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function ModalBody({ children, className }: ModalProps) {
  return (
    <div className={['min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalProps) {
  return (
    <div className={['flex-none border-t border-white/10 bg-(--color-panel) p-4 sm:p-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
