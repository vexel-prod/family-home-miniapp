import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import type { MonthlyRatingSummary } from '@entities/monthly-rating'

type MonthlyRatingBoardProps = {
  summary: MonthlyRatingSummary
}

export function MonthlyRatingBoard({ summary }: MonthlyRatingBoardProps) {
  const leader = summary.leaderboard[0]

  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.12, duration: 0.35, ease: 'easeOut' }}
      className='grid min-h-0 flex-1 gap-4 overflow-y-auto rounded-md px-4 py-4 text-white sm:px-6'
    >
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <SimpleMetric
          label='Лидер 🏆'
          value={summary.leadingName}
        />
        <SimpleMetric
          label='EXP лидера'
          value={String(summary.leadingPoints)}
        />
        <SimpleMetric
          label='Всего задач'
          value={String(summary.totalTasks)}
        />
        <SimpleMetric
          label='Командный бонус'
          value={`${summary.teamBonusPoints} HC`}
        />
      </div>

      <div className='rounded-md border border-white/10 bg-white/6 p-4'>
        <div className='text-xs uppercase tracking-[0.22em] text-white/45'>
          {summary.currentUser ? 'Твоя позиция' : 'Статус гонки'}
        </div>
        {summary.currentUser ? (
          <div className='mt-3 grid gap-3 sm:grid-cols-3'>
            <SimpleMetric
              label='Место'
              value={`#${summary.currentUser.place}`}
            />
            <SimpleMetric
              label='EXP'
              value={String(summary.currentUser.points)}
            />
            <SimpleMetric
              label='Отставание'
              value={
                summary.currentUser.gapToLeader > 0 ? `${summary.currentUser.gapToLeader} EXP` : '0'
              }
            />
          </div>
        ) : (
          <div className='mt-3 text-sm text-white/65'>
            {leader
              ? `Сейчас лидирует ${leader.name} с ${leader.points} EXP.`
              : 'Пока нет выполненных задач в этом месяце.'}
          </div>
        )}
      </div>

      <div className='rounded-md border border-white/10 bg-white/6 p-4'>
        <div className='text-xs uppercase tracking-[0.22em] text-white/45'>
          Промежуточные результаты
        </div>
        <div className='mt-3 space-y-2'>
          {summary.leaderboard.length ? (
            summary.leaderboard.map((member, index) => (
              <div
                key={member.name}
                className='grid gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-3 sm:grid-cols-[3rem_1fr_auto_auto]'
              >
                <div className='text-sm font-semibold text-white/45'>{index + 1}</div>
                <div className='text-sm font-semibold text-white'>{member.name}</div>
                <div className='text-sm text-white/65'>
                  Задачи: {member.completedCount}, быстрые: {member.fastCount}
                </div>
                <div className='text-sm font-semibold text-white'>{member.points} EXP</div>
              </div>
            ))
          ) : (
            <div className='text-sm text-white/65'>В этом месяце еще нет закрытых задач.</div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

export function OverallHouseholdLeaderboardBoard({ summary }: MonthlyRatingBoardProps) {
  const bestHousehold = summary.overallLeaderboard[0]

  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.12, duration: 0.35, ease: 'easeOut' }}
      className='grid min-h-0 flex-1 gap-4 overflow-y-auto rounded-md px-4 py-4 text-white sm:px-6'
    >
      <div className='mt-3 space-y-3'>
        {summary.overallLeaderboard.length ? (
          summary.overallLeaderboard.map((household, index) => (
            <div
              key={household.householdId}
              className={`grid gap-3 rounded-[1.4rem] border px-4 py-4 sm:grid-cols-[3rem_minmax(0,1.4fr)_auto_auto_auto] ${
                index === 0
                  ? 'border-amber-300/20 bg-amber-300/40'
                  : index === 1
                    ? 'border-slate-200/25 bg-slate-200/20'
                    : index === 2
                      ? 'border-orange-300/20 bg-orange-300/20'
                      : 'border-white/10 bg-white/6'
              }`}
            >
              <div className='grid grid-cols-[auto_1fr_auto] items-center border-b border-white/10 pb-2'>
                <span className='text-base font-black text-white/56'>#{index + 1}</span>
                <span className='justify-self-center truncate text-base font-semibold text-white'>
                  {household.householdName}
                </span>
              </div>
              <div className='grid grid-cols-2 place-content-between'>
                <div className='grid grid-rows-3 gap-2'>
                  <div className='text-sm text-white/72'>LVL {household.level}</div>
                  <div className='text-sm text-white/72'>{household.totalExp} EXP</div>
                  <div className='text-sm text-white/72'>
                    Серия: {household.streakWithoutOverdue}
                  </div>
                </div>

                {index === 0 ? (
                  <span className='text-8xl text-end'>🥇</span>
                ) : index === 1 ? (
                  <span className='text-8xl text-end'>🥈</span>
                ) : index === 2 ? (
                  <span className='text-8xl text-end'>🥉</span>
                ) : (
                  ''
                )}
              </div>
            </div>
          ))
        ) : (
          <div className='text-sm text-white/65'>Пока не из чего строить общий рейтинг семей.</div>
        )}
      </div>
    </motion.section>
  )
}

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md border border-white/10 bg-white/5 px-3 py-3'>
      <div className='text-[11px] uppercase tracking-[0.2em] text-white/45'>{label}</div>
      <div className='mt-2 text-base font-semibold text-white'>{value}</div>
    </div>
  )
}
