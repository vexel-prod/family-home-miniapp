import { motion } from 'framer-motion'

import { toastReveal } from '@/shared/lib/animations'

type NoticeToastProps = {
  tone: 'success' | 'error'
  label: string
  title: string
  icon: string
}

const cardToneClassName = {
  success:
    'border-emerald-300/35 bg-[rgba(243,255,247,0.96)] text-emerald-950 shadow-[var(--shadow-toast-success)]',
  error:
    'border-rose-300/35 bg-[rgba(255,244,245,0.96)] text-rose-950 shadow-[var(--shadow-toast-danger)]',
}

const iconToneClassName = {
  success: 'bg-emerald-500 shadow-[var(--shadow-accent)]',
  error: 'bg-rose-500 shadow-[var(--shadow-danger)]',
}

export function NoticeToast({ tone, label, title, icon }: NoticeToastProps) {
  return (
    <motion.div
      initial={toastReveal.initial}
      animate={toastReveal.animate}
      exit={toastReveal.exit}
      className={`pointer-events-auto w-full max-w-sm rounded-md border p-5 backdrop-blur-xl ${cardToneClassName[tone]}`}
    >
      <div className='flex items-start gap-4'>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white ${iconToneClassName[tone]}`}
        >
          {icon}
        </div>
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-[0.26em] opacity-80'>{label}</div>
          <div className='text-base font-semibold leading-6'>{title}</div>
        </div>
      </div>
    </motion.div>
  )
}
