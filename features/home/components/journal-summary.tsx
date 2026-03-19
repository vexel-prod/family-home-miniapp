import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'

type JournalSummaryProps = {
  completedTasksCount: number
  leaderName: string
  leaderPoints: number
  lastCompletedAt: string
  balanceLabel: string
  profileLevel: number
  profileExpToNextLevel: number
  onOpenJournal: () => void
  onOpenLastCompleted: () => void
  onOpenLeaderboard: () => void
  onOpenBonusShop: () => void
  onOpenProfile: () => void
}

export function JournalSummary({
  completedTasksCount,
  leaderName,
  leaderPoints,
  lastCompletedAt,
  balanceLabel,
  profileLevel,
  profileExpToNextLevel,
  onOpenJournal,
  onOpenLastCompleted,
  onOpenLeaderboard,
  onOpenBonusShop,
  onOpenProfile,
}: JournalSummaryProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
      className='max-h-[50dvh] overflow-auto rounded-md border border-white/10 bg-(--color-surface) p-4 shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'
    >
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <button
          type='button'
          className='rounded-xl border border-white/10 bg-white/8 p-5 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
          onClick={onOpenJournal}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
            Всего выполненных задач:
          </div>
          <div className='mt-3 text-lg font-bold text-white'>
            {completedTasksCount === 0 ? 'Нет выполненных задач' : completedTasksCount}
          </div>
        </button>

        <button
          type='button'
          className='rounded-xl border border-white/10 bg-white/8 p-5 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
          onClick={onOpenLastCompleted}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
            Последнее закрытие:
          </div>
          <div className='mt-3 text-lg font-bold text-white'>{lastCompletedAt}</div>
        </button>
        <button
          type='button'
          className='rounded-xl border border-white/10 bg-white/8 p-5 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
          onClick={onOpenLeaderboard}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
            доска лидеров
          </div>
          <div className='mt-3 text-lg font-bold text-white'>{leaderName}</div>
          <div className='mt-2 text-sm text-white/65'>
            {leaderPoints > 0 ? `${leaderPoints} баллов в этом месяце` : 'Открыть рейтинг месяца'}
          </div>
        </button>

        <button
          type='button'
          className='rounded-xl border border-white/10 bg-white/8 p-5 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
          onClick={onOpenBonusShop}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
            Магазин бонусов
          </div>
          <div className='mt-3 text-lg font-bold text-white'>{balanceLabel}</div>
          <div className='mt-2 text-sm text-white/65'>
            Открыть карточки услуг месяца
          </div>
        </button>

        <button
          type='button'
          className='rounded-xl border border-white/10 bg-white/8 p-5 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
          onClick={onOpenProfile}
        >
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
            Личный кабинет
          </div>
          <div className='mt-3 text-lg font-bold text-white'>LVL {profileLevel}</div>
          <div className='mt-2 text-sm text-white/65'>
            До следующего уровня: {profileExpToNextLevel} exp
          </div>
        </button>
      </div>
    </motion.section>
  )
}
