import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type AppModalProps = {
  children: ReactNode
}

export function ModalOverlay({ children }: AppModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex flex-col justify-center overflow-hidden bg-(--overlay-backdrop) px-4 pb-4 pt-[max(env(safe-area-inset-top),8rem)] backdrop-blur-md md:justify-center md:px-5 md:pb-5 md:pt-[max(env(safe-area-inset-top),5rem)]'>
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
    'flex w-full flex-col overflow-hidden rounded-md border border-white/10 bg-[var(--color-panel)] text-[var(--color-panel-text)] shadow-[var(--shadow-panel)] backdrop-blur-xl',
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
          ? 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2rem)'
          : 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2.5rem)',
      }}
    >
      {children}
    </motion.div>
  )
}
