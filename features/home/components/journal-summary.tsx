import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'

type JournalSummaryProps = {
  completedTasksCount: number
  leaderPoints: number
  balanceLabel: string
  profileLevel: number
  profileExpToNextLevel: number
  profileExp: number
  onOpenJournal: () => void
  onOpenLeaderboard: () => void
  onOpenBonusShop: () => void
  onOpenProfile: () => void
}

export function JournalSummary({
  completedTasksCount,
  leaderPoints,
  balanceLabel,
  profileLevel,
  profileExp,
  onOpenJournal,
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
      className='rounded-md border border-white/10 bg-(--color-surface) p-4 shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'
    >
      <div className='grid grid-cols-2 gap-2 lg:grid-cols-4'>
        <TabButton
          label='Журнал'
          caption={completedTasksCount > 0 ? `${completedTasksCount} задач` : 'История действий'}
          onClick={onOpenJournal}
        />
        <TabButton
          label='Лидерборд'
          caption={leaderPoints > 0 ? `${leaderPoints} баллов` : 'Рейтинг месяца'}
          onClick={onOpenLeaderboard}
        />
        <TabButton
          label='Магазин'
          caption={balanceLabel}
          onClick={onOpenBonusShop}
        />
        <TabButton
          label='Кабинет'
          caption={`LVL ${profileLevel} / EXP ${profileExp}`}
          onClick={onOpenProfile}
        />
      </div>
    </motion.section>
  )
}

function TabButton({
  label,
  caption,
  onClick,
}: {
  label: string
  caption: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      className='rounded-md border border-white/10 bg-white/8 px-4 py-4 text-left text-white transition-transform duration-150 hover:scale-[0.99] shadow-(--shadow-card)'
      onClick={onClick}
    >
      <div className='text-sm font-semibold text-white'>{label}</div>
      <div className='mt-1 text-xs text-white/55'>{caption}</div>
    </button>
  )
}
