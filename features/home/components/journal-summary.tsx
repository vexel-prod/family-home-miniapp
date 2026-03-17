import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'

type JournalSummaryProps = {
  completedTasksCount: number
  lastCompletedBy: string
  lastCompletedAt: string
  onOpenJournal: () => void
}

export function JournalSummary({
  completedTasksCount,
  lastCompletedBy,
  lastCompletedAt,
  onOpenJournal,
}: JournalSummaryProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
      className='rounded-2xl border border-[rgba(15,23,42,0.08)] bg-(--color-surface) p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] sm:p-6'
    >
      <div className='grid gap-4 sm:grid-cols-3'>
        <button
          type='button'
          className='rounded-lg bg-(--color-success-soft) p-4 text-left transition-transform duration-150 hover:scale-[0.99] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
          onClick={onOpenJournal}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
            Всего выполненных задач:
          </div>
          <div className='mt-3 text-lg font-bold'>
            {completedTasksCount === 0 ? 'Нет выполненных задач' : completedTasksCount}
          </div>
        </button>

        <div className='rounded-lg border border-[rgba(15,23,42,0.08)] bg-(--color-surface-mint) p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
          <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
            Последний исполнитель:
          </div>
          <div className='mt-3 text-lg font-bold'>{lastCompletedBy}</div>
        </div>

        <div className='rounded-lg border border-[rgba(15,23,42,0.08)] bg-(--color-surface-lilac) p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
          <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
            Последнее закрытие:
          </div>
          <div className='mt-3 text-lg font-bold'>{lastCompletedAt}</div>
        </div>
      </div>
    </motion.section>
  )
}
