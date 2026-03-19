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
      className='hero overflow-hidden rounded-md border border-white/10 bg-(--dashboard-panel) text-white shadow-(--shadow-panel) backdrop-blur-xl'
      style={{
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(/dashboard-image.png)',
      }}
    >
      <div className='hero-content flex w-full max-w-none flex-col gap-6 px-4 py-6 sm:px-6'>
        <div className='flex w-full items-center justify-center'>
          <div className='flex flex-col gap-6'>
            <TypingText
              key={actorName}
              typedText={`Привет, ${actorName} 👋`}
            />
          </div>
        </div>

        <div className='w-full grid grid-cols-2 gap-4'>
          <button
            type='button'
            className='rounded-xl bg-(--color-brand-home) p-5 text-left text-[#111827] shadow-(--shadow-card) transition-transform duration-150 hover:scale-[0.99]'
            onClick={onOpenHousehold}
          >
            <div className='flex items-center gap-2 text-xs uppercase tracking-[0.28em]'>
              Задачи: <span className='font-bold text-2xl'>{openTasksCount}</span>
            </div>
            <div className='mt-2 text-base'>Открыть список</div>
          </button>

          <button
            type='button'
            className='rounded-xl bg-(--color-brand-shopping) p-5 text-left text-[#111827] shadow-(--shadow-card) transition-transform duration-150 hover:scale-[0.99]'
            onClick={onOpenShopping}
          >
            <div className='flex items-center gap-2 text-xs uppercase tracking-[0.28em]'>
              Покупки: <span className='font-bold text-2xl'>{shoppingItemsCount}</span>
            </div>
            <div className='mt-2 text-base'>Открыть список</div>
          </button>
        </div>
      </div>
    </motion.section>
  )
}
