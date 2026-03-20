import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'

type JournalSummaryProps = {
  completedTasksCount: number
  leaderPoints: number
  balanceLabel: string
  profileLevel: number
  profileExpToNextLevel: number
  profileExp: number
  openTasksCount: number
  shoppingItemsCount: number
  onOpenJournal: () => void
  onOpenLeaderboard: () => void
  onOpenBonusShop: () => void
  onOpenProfile: () => void
  onOpenHousehold: () => void
  onOpenShopping: () => void
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
  onOpenHousehold,
  onOpenShopping,
  openTasksCount,
  shoppingItemsCount,
}: JournalSummaryProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
      className='w-full rounded-md border border-white/10 bg-(--color-surface) p-4 shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'
    >
      <div className='grid grid-cols-2 gap-4'>
        <button
          type='button'
          className='border border-white/20 h-full flex items-center justify-center rounded-md bg-(--color-brand-home) text-center p-px inset-shadow-sm transition-transform duration-150 hover:scale-[0.99]'
          onClick={onOpenHousehold}
        >
          <div className='p-4 flex items-center justify-center w-full h-full bg-black/12 text-(--color-panel) rounded-md font-black shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] transition-transform duration-150 border border-white/2'>
            {'ЗАДАЧИ' + ': ' + openTasksCount}
          </div>
        </button>

        <button
          type='button'
          className='border border-white/20 h-full flex items-center justify-center rounded-md bg-(--color-brand-shopping) p-px text-center inset-shadow-sm transition-transform duration-150 hover:scale-[0.99]'
          onClick={onOpenShopping}
        >
          <div className='p-4 flex items-center justify-center w-full h-full bg-black/12 text-(--color-panel) rounded-md font-black shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] transition-transform duration-150 border border-white/2'>
            {'ПОКУПКИ' + ': ' + shoppingItemsCount}
          </div>
        </button>
        <TabButton
          label='Журнал действий'
          caption={completedTasksCount > 0 ? `${completedTasksCount} задач` : 'История действий'}
          onClick={onOpenJournal}
        />
        <TabButton
          label='Панель рейтинга'
          caption={leaderPoints > 0 ? `${leaderPoints} EXP` : 'Рейтинг месяца'}
          onClick={onOpenLeaderboard}
        />
        <TabButton
          label='Магазин бонусов'
          caption={balanceLabel}
          onClick={onOpenBonusShop}
        />
        <TabButton
          label='Семейный кабинет'
          caption={`Семья LVL ${profileLevel} / EXP ${profileExp}`}
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
      className='rounded-md w-full h-full border border-white/10 bg-white/8 p-px text-left text-white transition-transform duration-150 hover:scale-[0.99] inset-shadow-sm'
      onClick={onClick}
    >
      <div className='w-full h-full p-4 rounded-md shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] transition-transform duration-150 border border-white/2'>
        <div className='text-sm font-semibold text-white'>{label}</div>
        <div className='mt-1 text-xs text-white/55'>{caption}</div>
      </div>
    </button>
  )
}
