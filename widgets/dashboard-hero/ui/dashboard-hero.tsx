import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { TypingText } from './typing-text'

type DashboardHeroProps = {
  actorName: string
}

export function DashboardHero({ actorName }: DashboardHeroProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='hero min-h-50 overflow-hidden rounded-md border border-white/10 bg-(--dashboard-panel) text-white shadow-(--shadow-panel) backdrop-blur-xl p-4'
      style={{
        backgroundImage: 'linear-gradient(#1d1d1db1, #13131380), url(/dashboard-image.png)',
      }}
    >
      <TypingText
        key={actorName}
        typedText={`Привет, ${actorName}, добро пожаловать в Household!\nЗдесь ты можешь управлять своими задачами, отслеживать прогресс и зарабатывать очки лидера, чтобы получать крутые бонусы!`}
      />
    </motion.section>
  )
}
