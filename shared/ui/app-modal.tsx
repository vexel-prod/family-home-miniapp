import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type ModalProps = {
  children: ReactNode
  className?: string
}

export function ModalOverlay({ children, className }: ModalProps) {
  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col justify-center overflow-hidden px-4 backdrop-blur-md',
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
    'flex w-full flex-col overflow-hidden rounded-md border border-white/10 bg-(--color-panel) text-[var(--color-panel-text)] ',
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
