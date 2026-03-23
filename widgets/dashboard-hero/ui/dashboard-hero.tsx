import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { TypingText } from './typing-text'

type DashboardHeroProps = {
  actorName: string
  typedText: string
  urgentSummary?: {
    totalCount: number
    buckets: Array<{
      label: string
      count: number
      tone: 'danger' | 'warning' | 'soon'
    }>
  } | null
}

export function DashboardHero({ actorName, typedText, urgentSummary = null }: DashboardHeroProps) {
  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='hero min-h-50 w-full overflow-hidden rounded-md inset-shadow-sm text-white bg-no-repeat bg-cover bg-center bg-[url(/hero.png)] p-px'
    >
      <div className='flex justify-center items-center p-4 h-full w-full bg-black/25 border border-white/10 inset-shadow-sm rounded-md'>
        <div className={`flex ${urgentSummary ? 'w-full' : 'w-max'} flex-col gap-3`}>
          {urgentSummary ? (
            <div className='rounded-3xl border border-white/12 bg-black/26 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-md'>
              <div className='flex justify-between items-center'>
                <span>Срочные задачи</span>
                <span className='rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/64'>
                  Focus
                </span>
              </div>

              <div className='flex items-start justify-between gap-4'>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {urgentSummary.buckets.map(bucket => (
                    <div
                      key={bucket.label}
                      className={`min-w-27 flex-1 rounded-[1.05rem] border px-3 py-3 ${
                        bucket.tone === 'danger'
                          ? 'border-rose-300/18 bg-rose-500/14 text-rose-50'
                          : bucket.tone === 'warning'
                            ? 'border-amber-300/18 bg-amber-400/14 text-amber-50'
                            : 'border-sky-300/18 bg-sky-400/14 text-sky-50'
                      }`}
                    >
                      <div className='text-[10px] font-black uppercase tracking-[0.2em] opacity-75'>
                        {bucket.label}
                      </div>
                      <div className='mt-2 text-2xl font-black leading-none'>{bucket.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {!urgentSummary ? (
            <TypingText
              key={`${actorName}-${typedText}`}
              className='whitespace-pre-line bg-black/20 backdrop-blur-xs inline-block p-4 rounded-md text-left text-shadow-md'
              typedText={typedText}
            />
          ) : null}
        </div>
      </div>
    </motion.section>
  )
}
