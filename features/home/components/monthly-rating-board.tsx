import { motion } from 'framer-motion'

import { reveal } from '@/shared/lib/animations'
import type { MonthlyRatingSummary } from '@/shared/lib/monthly-rating'

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
      className='flex min-h-full flex-col rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(255,248,214,0.96),rgba(255,255,255,0.86))] p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)] sm:p-5'
    >
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
              Рейтинг месяца
            </div>
            <h2 className='mt-2 text-xl font-semibold text-(--color-page-text) sm:text-2xl'>
              Домашняя гонка за {summary.monthLabel}
            </h2>
            <p className='mt-2 max-w-2xl text-sm text-(--color-text-muted)'>
              10 баллов за закрытую задачу, +6 за срочную, +3 за быстрый отклик за первые 24 часа.
              Совместные закрытия копят отдельный командный бонус.
            </p>
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
          <div className='flex flex-col rounded-[1.5rem] bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]'>
            <div className='flex items-center justify-between gap-3'>
              <div className='text-sm font-semibold text-(--color-page-text)'>Промежуточные результаты</div>
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
                  В этом месяце еще нет закрытых задач. Первый завершенный бытовой шаг сразу откроет гонку.
                </div>
              )}
            </div>
          </div>

          <div className='flex flex-col gap-4'>
            <div className='rounded-[1.5rem] bg-[#2d3648] p-4 text-white shadow-[0_22px_60px_rgba(17,24,39,0.26)]'>
              <div className='text-xs uppercase tracking-[0.24em] text-white/60'>Мотивация</div>
              <div className='mt-3 text-lg font-semibold'>
                {summary.currentUser?.nextMilestone
                  ? `${summary.currentUser.nextMilestone.pointsLeft} баллов до награды`
                  : 'Главная награда уже взята'}
              </div>
              <p className='mt-2 text-sm text-white/70'>
                {summary.currentUser?.nextMilestone
                  ? `Следующая цель: ${summary.currentUser.nextMilestone.label}.`
                  : 'Можно удержать лидерство и добрать максимум командных баллов.'}
              </p>
              {summary.currentUser ? (
                <div className='mt-4 rounded-[1.25rem] bg-white/8 p-3 text-sm text-white/80'>
                  {summary.currentUser.name}: {summary.currentUser.points} баллов, место #{summary.currentUser.place}.
                </div>
              ) : null}
            </div>

            <div className='flex flex-col rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-white/75 p-4'>
              <div className='text-xs uppercase tracking-[0.24em] text-(--color-text-muted)'>
                Идеи наград
              </div>
              <div className='mt-3 flex flex-col gap-2'>
                {summary.milestones.map(milestone => (
                  <div
                    key={milestone.target}
                    className='flex-none rounded-[1rem] bg-(--color-surface-mint) px-3 py-3 text-sm text-(--color-page-text)'
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
      <div className='text-[11px] uppercase tracking-[0.22em] text-(--color-text-muted)'>{label}</div>
      <div className='mt-2 text-base font-semibold text-(--color-page-text)'>{value}</div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-[1rem] bg-(--color-surface-cream) px-3 py-2'>
      <div className='text-[11px] uppercase tracking-[0.18em]'>{label}</div>
      <div className='mt-1 font-semibold text-(--color-page-text)'>{value}</div>
    </div>
  )
}
