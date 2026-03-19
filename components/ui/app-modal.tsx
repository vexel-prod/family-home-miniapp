import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type AppModalProps = {
  children: ReactNode
}

export function ModalOverlay({ children }: AppModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex flex-col justify-center overflow-hidden bg-(--overlay-backdrop) px-4 pb-4 pt-20 backdrop-blur-md'>
      {children}
    </div>
  )
}

type ModalPanelProps = {
  children: ReactNode
  wide?: boolean
  tall?: boolean
}

export function ModalPanel({ children, wide = false, tall = false }: ModalPanelProps) {
  const classNames = [
    'flex w-full flex-col overflow-hidden rounded-md border border-white/10 bg-[var(--color-panel)] text-[var(--color-panel-text)] shadow-[var(--shadow-panel)] backdrop-blur-[2px]',
    wide ? 'mx-auto max-w-5xl' : 'mx-auto max-w-2xl',
  ]

  return (
    <motion.div
      initial={modalReveal.initial}
      animate={modalReveal.animate}
      transition={modalReveal.transition}
      className={classNames.filter(Boolean).join(' ')}
      style={{
        maxHeight: tall
          ? 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem)'
          : 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.25rem)',
      }}
    >
      {children}
    </motion.div>
  )
}
