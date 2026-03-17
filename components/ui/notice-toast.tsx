import { motion } from 'framer-motion'

import { toastReveal } from '@/shared/lib/animations'

type NoticeToastProps = {
  tone: 'success' | 'error'
  label: string
  title: string
  icon: string
}

export function NoticeToast({ tone, label, title, icon }: NoticeToastProps) {
  return (
    <motion.div
      initial={toastReveal.initial}
      animate={toastReveal.animate}
      exit={toastReveal.exit}
      className={`toast-card toast-card--${tone}`}
    >
      <div className='flex items-start gap-4'>
        <div className={`toast-icon toast-icon--${tone}`}>{icon}</div>
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-[0.26em] opacity-80'>
            {label}
          </div>
          <div className='text-base font-semibold leading-6'>{title}</div>
        </div>
      </div>
    </motion.div>
  )
}
