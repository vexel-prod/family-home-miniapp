import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { TypingText } from './typing-text'

type DashboardHeroProps = {
  actorName: string
  typedText: string
  urgentBubble?: {
    label: string
    title: string
    caption: string
  } | null
}

export function DashboardHero({ actorName, typedText, urgentBubble = null }: DashboardHeroProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='hero min-h-50 w-full overflow-hidden rounded-md inset-shadow-sm text-white bg-no-repeat bg-cover bg-center bg-[url(/hero.png)] p-px'
    >
      <div className='flex justify-center items-center p-4 h-full w-full bg-black/25 border border-white/10 inset-shadow-sm rounded-md'>
        <div className='flex w-full flex-col gap-3'>
          {urgentBubble ? (
            <div className='max-w-[22rem] self-end rounded-[1.4rem] border border-rose-300/20 bg-rose-500/16 px-4 py-3 text-left shadow-[0_12px_32px_rgba(244,63,94,0.18)] backdrop-blur-md'>
              <div className='text-[10px] font-black uppercase tracking-[0.22em] text-rose-100/80'>
                {urgentBubble.label}
              </div>
              <div className='mt-1 text-sm font-semibold text-white'>{urgentBubble.title}</div>
              <div className='mt-1 text-xs leading-5 text-rose-50/78'>{urgentBubble.caption}</div>
            </div>
          ) : null}

          <TypingText
            key={`${actorName}-${typedText}`}
            className='whitespace-pre-line bg-black/20 backdrop-blur-xs inline-block p-4 rounded-md text-left text-shadow-md'
            typedText={typedText}
          />
        </div>
      </div>
    </motion.section>
  )
}
