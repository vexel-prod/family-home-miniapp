import { motion } from 'framer-motion'
import { reveal } from '@/shared/lib/animations'

type JournalSummaryProps = {
  completedTasksCount: number
  leaderPoints: number
  balanceLabel: string
  profileLevel: number
  profileTotalExp: number
  openTasksCount: number
  shoppingItemsCount: number
  onOpenJournal: () => void
  onOpenLeaderboard: () => void
  onOpenBonusShop: () => void
  onOpenProfile: () => void
  onOpenHousehold: () => void
  onOpenShopping: () => void
  loading?: boolean
}

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod100 >= 11 && mod100 <= 14) {
    return many
  }

  if (mod10 === 1) {
    return one
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  return many
}

export function JournalSummary({
  completedTasksCount,
  leaderPoints,
  balanceLabel,
  profileLevel,
  profileTotalExp,
  onOpenJournal,
  onOpenLeaderboard,
  onOpenBonusShop,
  onOpenProfile,
  onOpenHousehold,
  onOpenShopping,
  openTasksCount,
  shoppingItemsCount,
  loading = false,
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
        {loading ? (
          <>
            <ActionTileSkeleton tone='home' />
            <ActionTileSkeleton tone='shopping' />
            <TabButtonSkeleton wide />
            <TabButtonSkeleton />
            <TabButtonSkeleton />
            <TabButtonSkeleton wide />
          </>
        ) : (
          <>
            <button
              type='button'
              className='border border-white/20 h-full flex items-center justify-center rounded-md bg-(--color-brand-home) text-center p-px inset-shadow-sm transition-transform duration-150 hover:scale-[0.99]'
              onClick={onOpenHousehold}
            >
              <div className='p-4 flex items-center justify-center w-full h-full bg-black/12 text-(--color-panel) rounded-md font-black shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] transition-transform duration-150 border border-white/2 uppercase'>
                {openTasksCount === 0 ? 'нет' : `${openTasksCount}`}{' '}
                {pluralizeRu(openTasksCount, 'задача', 'задачи', 'задач')}
              </div>
            </button>

            <button
              type='button'
              className='border border-white/20 h-full flex items-center justify-center rounded-md bg-(--color-brand-shopping) p-px text-center inset-shadow-sm transition-transform duration-150 hover:scale-[0.99]'
              onClick={onOpenShopping}
            >
              <div className='p-4 flex items-center justify-center w-full h-full bg-black/12 text-(--color-panel) rounded-md font-black shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] transition-transform duration-150 border border-white/2 uppercase'>
                {shoppingItemsCount === 0 ? 'нет' : `${shoppingItemsCount}`}{' '}
                {pluralizeRu(shoppingItemsCount, 'покупка', 'покупки', 'покупок')}
              </div>
            </button>
            <TabButton
              label='Журнал действий'
              caption={
                completedTasksCount > 0
                  ? `${completedTasksCount} ${pluralizeRu(completedTasksCount, 'запись', 'записи', 'записей')}`
                  : 'История действий'
              }
              onClick={onOpenJournal}
            />
            <TabButton
              label='Панель рейтинга'
              caption={leaderPoints > 0 ? `Март: лидер ${leaderPoints} EXP` : 'Рейтинг месяца'}
              onClick={onOpenLeaderboard}
            />
            <TabButton
              label='Магазин бонусов'
              caption={balanceLabel}
              onClick={onOpenBonusShop}
            />
            <TabButton
              label='Семейный кабинет'
              caption={`Семья LVL ${profileLevel} / ${profileTotalExp} EXP`}
              onClick={onOpenProfile}
            />
          </>
        )}
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

function ActionTileSkeleton({ tone }: { tone: 'home' | 'shopping' }) {
  return (
    <div
      aria-hidden='true'
      className={`border border-white/20 h-full rounded-md p-px inset-shadow-sm ${
        tone === 'home' ? 'bg-(--color-brand-home)' : 'bg-(--color-brand-shopping)'
      }`}
    >
      <div className='p-4 w-full h-full rounded-md border border-white/2 bg-white/8 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
        <div className='flex h-full items-center justify-center'>
          <div className='skeleton h-6 w-28 rounded-full bg-white/14' />
        </div>
      </div>
    </div>
  )
}

function TabButtonSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      aria-hidden='true'
      className='rounded-md w-full h-full border border-white/10 bg-white/8 p-px inset-shadow-sm'
    >
      <div className='w-full h-full p-4 rounded-md bg-white/8 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] border border-white/2'>
        <div
          className={
            wide
              ? 'skeleton h-4 w-32 rounded-full bg-white/15'
              : 'skeleton h-4 w-24 rounded-full bg-white/15'
          }
        />
        <div
          className={
            wide
              ? 'mt-3 skeleton h-3 w-24 rounded-full bg-white/12'
              : 'mt-3 skeleton h-3 w-20 rounded-full bg-white/12'
          }
        />
      </div>
    </div>
  )
}
