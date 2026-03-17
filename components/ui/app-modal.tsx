import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { modalReveal } from '@/shared/lib/animations'

type AppModalProps = {
  children: ReactNode
}

export function ModalOverlay({ children }: AppModalProps) {
  return <div className='app-overlay'>{children}</div>
}

type ModalPanelProps = {
  children: ReactNode
  wide?: boolean
  tall?: boolean
}

export function ModalPanel({ children, wide = false, tall = false }: ModalPanelProps) {
  const classNames = ['modal-panel']

  if (wide) {
    classNames.push('modal-panel--wide')
  }

  if (tall) {
    classNames.push('modal-panel--tall')
  }

  return (
    <motion.div
      initial={modalReveal.initial}
      animate={modalReveal.animate}
      transition={modalReveal.transition}
      className={classNames.join(' ')}
    >
      {children}
    </motion.div>
  )
}
