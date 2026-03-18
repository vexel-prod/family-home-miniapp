import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { TypingText } from '@/features/home/components/typing-text'

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
      className='overflow-hidden rounded-2xl bg-(--dashboard-panel) text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] bg-cover bg-center bg-no-repeat md:bg-contain'
      style={{
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(/dashboard-image.png)',
      }}
    >
      <div className='flex flex-col gap-4 p-4 sm:p-6'>
        <div className='flex items-center flex-wrap md:flex-nowrap'>
          <div className='flex flex-col gap-6'>
            <div className='inline-flex w-max items-center rounded-md bg-white/10 backdrop-blur-[2px] px-4 py-3 text-xs uppercase tracking-(--letter-spacing-tag) text-white/70 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
              Family Plane
            </div>
            <TypingText
              typedText={`Привет, ${actorName}`}
            />
          </div>
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
