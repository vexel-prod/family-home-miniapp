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
      className='surface-panel p-5'
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-2'>
          <div className='eyebrow eyebrow--muted'>Журнал задач</div>
        </div>
      </div>

      <div className='mt-5 grid gap-3 sm:grid-cols-3'>
        <button
          type='button'
          className='stat-card bg-(--color-surface-cream) text-left'
          onClick={onOpenJournal}
        >
          <div className='eyebrow eyebrow--muted tracking-[0.24em]'>Всего выполненных задач</div>
          <div className='mt-3 text-lg font-bold'>
            {completedTasksCount === 0 ? 'Нет выполненных задач' : completedTasksCount}
          </div>
        </button>

        <div className='stat-card bg-(--color-surface-mint)'>
          <div className='eyebrow eyebrow--muted tracking-[0.24em]'>Последний исполнитель</div>
          <div className='mt-3 text-lg font-bold'>{lastCompletedBy}</div>
        </div>

        <div className='stat-card bg-(--color-surface-lilac)'>
          <div className='eyebrow eyebrow--muted tracking-[0.24em]'>Последнее закрытие</div>
          <div className='mt-3 text-lg font-bold'>{lastCompletedAt}</div>
        </div>
      </div>
    </motion.section>
  )
}
