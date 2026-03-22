import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { TypingText } from './typing-text'

type DashboardHeroProps = {
  actorName: string
  typedText: string
}

export function DashboardHero({ actorName, typedText }: DashboardHeroProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='hero min-h-50 w-full overflow-hidden rounded-md inset-shadow-sm text-white bg-no-repeat bg-cover bg-center bg-[url(/hero.png)] p-px'
    >
      <div className='flex justify-center items-center p-4 h-full w-full bg-black/25 border border-white/10 inset-shadow-sm rounded-md'>
        <TypingText
          key={`${actorName}-${typedText}`}
          className='whitespace-pre-line bg-black/20 backdrop-blur-xs inline-block p-4 rounded-md text-left text-shadow-md'
          typedText={typedText}
        />
      </div>
    </motion.section>
  )
}
