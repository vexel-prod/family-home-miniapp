import { motion } from 'framer-motion'
import { modalReveal } from '@/shared/lib/animations'

import { type ReactNode } from 'react'

type ModalProps = {
  children: ReactNode
  className?: string
}

export function ModalOverlay({ children, className }: ModalProps) {
  return (
    <div
      className={[
        'px-4 fixed inset-0 z-50 flex w-full items-center justify-center overflow-hidden overscroll-none bg-[radial-gradient(circle_at_top,rgba(20,36,52,0.22),rgba(5,6,10,0.78)_52%)] backdrop-blur-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        paddingTop: 'max(4.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  )
}

export function ModalPanel({ children, className }: ModalProps) {
  const classNames = [
    'relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,18,36,0.96)_0%,rgba(20,16,31,0.98)_100%)] text-[var(--color-panel-text)] shadow-[0_24px_80px_rgba(0,0,0,0.42)]',
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
    <div
      className={['flex-none border-b border-white/10 bg-white/[0.02] p-4 sm:p-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function ModalBody({ children, className }: ModalProps) {
  return (
    <div
      className={['min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalProps) {
  return (
    <div
      className={['flex-none border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 sm:p-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
