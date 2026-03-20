import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import { formatPoints } from '@entities/bonus'
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
          label='Очки лидера'
          value={formatPoints(Math.round(summary.leadingPoints * 4))}
        />
        <SimpleMetric
          label='Всего задач'
          value={String(summary.totalTasks)}
        />
        <SimpleMetric
          label='Командный бонус'
          value={formatPoints(summary.teamBonusPoints * 4)}
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
              label='Очки'
              value={formatPoints(Math.round(summary.currentUser.points * 4))}
            />
            <SimpleMetric
              label='Отставание'
              value={
                summary.currentUser.gapToLeader > 0
                  ? formatPoints(Math.round(summary.currentUser.gapToLeader * 4))
                  : '0'
              }
            />
          </div>
        ) : (
          <div className='mt-3 text-sm text-white/65'>
            {leader
              ? `Сейчас лидирует ${leader.name} с ${formatPoints(Math.round(leader.points * 4))} баллами.`
              : 'Пока нет выполненных задач в этом месяце.'}
          </div>
        )}
        {summary.currentUser?.nextMilestone ? (
          <div className='mt-3 text-sm text-white/65'>
            До &quot;{summary.currentUser.nextMilestone.label}&quot; осталось{' '}
            {formatPoints(Math.round(summary.currentUser.nextMilestone.pointsLeft * 4))} балла.
          </div>
        ) : null}
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
                <div className='text-sm font-semibold text-white'>
                  {formatPoints(Math.round(member.points * 4))}
                </div>
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

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md border border-white/10 bg-white/5 px-3 py-3'>
      <div className='text-[11px] uppercase tracking-[0.2em] text-white/45'>{label}</div>
      <div className='mt-2 text-base font-semibold text-white'>{value}</div>
    </div>
  )
}
