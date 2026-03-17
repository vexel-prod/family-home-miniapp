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
      className='overflow-hidden rounded-2xl border border-white/10 bg-(--dashboard-panel) text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
    >
      <div className='space-y-6 p-4 sm:p-6'>
        <div className='space-y-3'>
          <div className='inline-flex items-center rounded-md bg-white/10 px-4 py-3 text-xs uppercase tracking-(--letter-spacing-tag) text-white/70 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
            Family Plane
          </div>
          <h1 className='font-(--font-family-heading) text-4xl leading-none sm:text-5xl'>
            Привет, <span className='font-bold'>{actorName}</span>!
          </h1>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <button
            type='button'
            className='rounded-3xl bg-(--color-brand-home) p-4 text-left text-(--color-page-text) transition-transform duration-150 hover:scale-[0.99] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
            onClick={onOpenHousehold}
          >
            <div className='flex gap-2 items-center text-xs uppercase tracking-widest'>
              Задачи: <span className='font-bold text-2xl'>{openTasksCount}</span>
            </div>
            <div className='mt-1 text-base'>Открыть список</div>
          </button>

          <button
            type='button'
            className='rounded-3xl bg-(--color-brand-shopping) p-4 text-left text-(--color-page-text) transition-transform duration-150 hover:scale-[0.99] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
            onClick={onOpenShopping}
          >
            <div className='flex gap-2 items-center text-xs uppercase tracking-widest'>
              Покупки: <span className='font-bold text-2xl'>{shoppingItemsCount}</span>
            </div>
            <div className='mt-1 text-base'>Открыть список</div>
          </button>
        </div>
      </div>
    </motion.section>
  )
}
