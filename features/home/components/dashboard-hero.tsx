import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'

type DashboardHeroProps = {
  actorName: string
  openTasksCount: number
  shoppingItemsCount: number
  onOpenHousehold: () => void
  onOpenShopping: () => void
}

export function DashboardHero({
  actorName,
  openTasksCount,
  shoppingItemsCount,
  onOpenHousehold,
  onOpenShopping,
}: DashboardHeroProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='panel-dark overflow-hidden'
    >
      <div className='space-y-6 px-5 py-6 sm:px-8 sm:py-8'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='space-y-3'>
            <h1 className='heading-display max-w-[13ch]'>Привет, {actorName}!</h1>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <button
            type='button'
            className='metric-card metric-card--home'
            onClick={onOpenHousehold}
          >
            <div className='flex items-center gap-2'>
              ЗАДАЧИ: <span className='font-black text-2xl'>{openTasksCount}</span>
            </div>
            <div className='mt-1 text-base'>Открыть весь список</div>
          </button>

          <button
            type='button'
            className='metric-card metric-card--shopping'
            onClick={onOpenShopping}
          >
            <div className='flex items-center gap-2'>
              КУПИТЬ: <span className='font-black text-2xl'>{shoppingItemsCount}</span>
            </div>
            <div className='mt-1 text-base'>Открыть весь список</div>
          </button>
        </div>
      </div>
    </motion.section>
  )
}
