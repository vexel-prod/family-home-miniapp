import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type AppModalProps = {
  children: ReactNode
}

export function ModalOverlay({ children }: AppModalProps) {
  return (
    <div
      id='modal-overlay'
      className='absolute inset-0 z-50 flex flex-col justify-center bg-(--overlay-backdrop) px-4 backdrop-blur-md'
    >
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
    'w-full overflow-hidden rounded-md border border-white/10 bg-[var(--color-panel)] text-[var(--color-panel-text)] shadow-[var(--shadow-panel)] backdrop-blur-xl',
    wide ? 'mx-auto max-w-5xl' : 'mx-auto max-w-2xl',
    tall ? 'max-h-[min(88dvh,56rem)]' : 'max-h-[min(84dvh,44rem)]',
  ]

  return (
    <motion.div
      id='modal-panel'
      initial={modalReveal.initial}
      animate={modalReveal.animate}
      transition={modalReveal.transition}
      className={classNames.filter(Boolean).join(' ')}
    >
      {children}
    </motion.div>
  )
}
