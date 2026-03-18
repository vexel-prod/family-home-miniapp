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
      className='flex flex-col justify-center absolute inset-0 z-50 bg-(--overlay-backdrop) backdrop-blur-md px-4'
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
    'rounded-xl border border-white/10 bg-[var(--color-panel)] text-[var(--color-panel-text)] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]',
    wide ? '' : '',
    tall ? '' : '',
  ]

  return (
    <motion.div
      id='modal-panel'
      initial={modalReveal.initial}
      animate={modalReveal.animate}
      transition={modalReveal.transition}
      className={classNames.filter(Boolean).join(' ')}
      style={{
        maxHeight: '',
      }}
    >
      {children}
    </motion.div>
  )
}
