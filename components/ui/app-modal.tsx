import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type AppModalProps = {
  children: ReactNode
}

export function ModalOverlay({ children }: AppModalProps) {
  return (
    <div className='w-full fixed inset-0 z-50 flex items-center justify-center bg-(--overlay-backdrop) px-4 pt-15 pb-15 backdrop-blur-md'>
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
    'mx-auto w-full max-h-[70dvh] min-w-fit rounded-[var(--radius-2xl)] border border-white/10 bg-[var(--color-panel)] text-[var(--color-panel-text)] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]',
    wide ? 'max-w-[42rem]' : 'max-w-md',
    tall ? 'flex flex-col overflow-hidden' : '',
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
