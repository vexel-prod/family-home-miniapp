import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import type { MonthlyRatingSummary } from '@/shared/lib/monthly-rating'

const motivationRules = [
  {
    rule: 'Закрытая задача',
    score: '3 балла',
  },
  {
    rule: 'Срочная задача',
    score: '+3 балла',
  },
  {
    rule: 'Быстрое закрытие',
    score: 'x1.5',
  },
  {
    rule: 'Сделано вместе',
    score: 'делим ровно',
  },
]

type MonthlyRatingBoardProps = {
  summary: MonthlyRatingSummary
}

export function MonthlyRatingBoard({ summary }: MonthlyRatingBoardProps) {
  const leader = summary.leaderboard[0]
  const chaseLabel = summary.currentUser
    ? summary.currentUser.gapToLeader > 0
      ? `До первого места ${summary.currentUser.gapToLeader} балл.`
      : 'Ты сейчас на первом месте.'
    : `Отрыв лидера ${summary.runnerUpGap} балл.`

  return (
    <motion.section
      variants={reveal}
      initial='hidden'
      animate='visible'
      transition={{ delay: 0.12, duration: 0.35, ease: 'easeOut' }}
      className='px-4 py-4 max-h-[45dvh] overflow-y-auto sm:px-6'
    >
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/70 shadow-[0_14px_40px_rgba(15,23,42,0.08)]'>
              <div className='grid grid-cols-[1.2fr_0.7fr] border-b border-[rgba(15,23,42,0.08)] bg-[linear-gradient(90deg,rgba(243,197,75,0.18),rgba(143,212,176,0.12))] px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-(--color-text-muted) sm:grid-cols-[1.1fr_0.45fr_1.1fr]'>
                <div>Правило</div>
                <div>Бонус</div>
                <div className='hidden sm:block'>Комментарий</div>
              </div>

              <div className='divide-y divide-[rgba(15,23,42,0.08)]'>
                {motivationRules.map(item => (
                  <div
                    key={item.rule}
                    className='grid grid-cols-[1.2fr_0.7fr] items-start gap-3 px-4 py-3 sm:grid-cols-[1.1fr_0.45fr_1.1fr]'
                  >
                    <div className='text-sm font-semibold text-(--color-page-text)'>{item.rule}</div>
                    <div className='text-sm font-semibold text-(--color-success-text)'>{item.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3 lg:min-w-[24rem] lg:grid-cols-4'>
            <StatCard
              label='Закрыто задач'
              value={String(summary.totalTasks)}
              tone='cream'
            />
            <StatCard
              label='Всего баллов'
              value={String(summary.totalPoints)}
              tone='white'
            />
            <StatCard
              label='Лидер'
              value={leader?.name ?? 'Пока пусто'}
              tone='mint'
            />
            <StatCard
              label='Командный бонус'
              value={`${summary.teamBonusPoints}`}
              tone='rose'
            />
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-[1.3fr_0.9fr]'>
          <div className='flex flex-col rounded-2xl bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]'>
            <div className='flex items-center justify-between gap-3'>
              <div className='text-sm font-semibold text-(--color-page-text)'>
                Промежуточные результаты
              </div>
              <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
                {chaseLabel}
              </div>
            </div>

            <div className='mt-4 flex flex-col gap-3'>
              {summary.leaderboard.length ? (
                summary.leaderboard.map((member, index) => (
                  <div
                    key={member.name}
                    className='flex-none rounded-[1.25rem] border border-white/80 bg-white/75 p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
                          {index === 0 ? 'Лидер месяца' : `${index + 1} место`}
                        </div>
                        <div className='mt-2 text-lg font-semibold text-(--color-page-text)'>
                          {member.name}
                        </div>
                      </div>

                      <div className='rounded-full bg-(--color-brand-home) px-3 py-1 text-sm font-semibold text-(--color-page-text)'>
                        {member.points} баллов
                      </div>
                    </div>

                    <div className='mt-4 grid grid-cols-3 gap-2 text-sm text-(--color-text-muted)'>
                      <MiniMetric
                        label='Задачи'
                        value={String(member.completedCount)}
                      />
                      <MiniMetric
                        label='Срочные'
                        value={String(member.urgentCount)}
                      />
                      <MiniMetric
                        label='Быстрые'
                        value={String(member.fastCount)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-[1.25rem] border border-dashed border-[rgba(15,23,42,0.12)] bg-white/60 p-4 text-sm text-(--color-text-muted)'>
                  В этом месяце еще нет закрытых задач. Первый завершенный бытовой шаг сразу откроет
                  гонку.
                </div>
              )}
            </div>
          </div>

          <div className='flex flex-col gap-4'>
            <div className='flex flex-col rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/75 p-4'>
              <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
                блок мотивации
              </div>
              <div className='mt-3 flex flex-col gap-2'>
                {summary.milestones.map(milestone => (
                  <div
                    key={milestone.target}
                    className='flex-none rounded-2xl bg-(--color-surface-mint) px-3 py-3 text-sm text-(--color-page-text)'
                  >
                    {milestone.target} баллов: {milestone.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'cream' | 'white' | 'mint' | 'rose'
}) {
  const toneClassName = {
    cream: 'bg-(--color-surface-cream)',
    white: 'bg-white/85',
    mint: 'bg-(--color-surface-mint)',
    rose: 'bg-(--color-danger-soft)',
  }[tone]

  return (
    <div className={`rounded-[1.2rem] ${toneClassName} p-3`}>
      <div className='text-[11px] uppercase tracking-[0.22em] text-(--color-text-muted)'>
        {label}
      </div>
      <div className='mt-2 text-base font-semibold text-(--color-page-text)'>{value}</div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl bg-(--color-surface-cream) px-3 py-2'>
      <div className='text-[11px] uppercase tracking-[0.18em]'>{label}</div>
      <div className='mt-1 font-semibold text-(--color-page-text)'>{value}</div>
    </div>
  )
}
