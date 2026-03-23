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
                summary.currentUser.gapToLeader > 0
                  ? `${summary.currentUser.gapToLeader} EXP`
                  : '0'
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
                <div className='text-sm font-semibold text-white'>
                  {member.points} EXP
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
      <div className='relative overflow-hidden rounded-[1.8rem] border border-amber-300/18 bg-linear-to-br from-[#3b1d07] via-[#5b2c09] to-[#1f1225] p-5 shadow-[0_20px_60px_rgba(245,158,11,0.18)]'>
        <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/10 to-transparent' />
        <div className='pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl' />
        <div className='text-[11px] uppercase tracking-[0.28em] text-amber-100/70'>
          общий рейтинг семей
        </div>

        {bestHousehold ? (
          <div className='mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]'>
            <div>
              <div className='text-sm uppercase tracking-[0.22em] text-amber-100/55'>
                Лучшая семья сейчас
              </div>
              <div className='mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl'>
                {bestHousehold.householdName}
              </div>
              <div className='mt-3 text-sm leading-6 text-amber-50/72'>
                Семья держит лучший общий темп по опыту, уровню и серии задач без просрочек.
              </div>
            </div>

            <div className='grid gap-3'>
              <SimpleMetric
                label='Уровень семьи'
                value={`LVL ${bestHousehold.level}`}
              />
              <SimpleMetric
                label='Опыт семьи'
                value={`${bestHousehold.totalExp} EXP`}
              />
              <SimpleMetric
                label='Серия без просрочек'
                value={`${bestHousehold.streakWithoutOverdue}`}
              />
            </div>
          </div>
        ) : (
          <div className='mt-4 text-sm text-amber-50/70'>
            Пока нет данных для общего семейного рейтинга.
          </div>
        )}
      </div>

      <div className='rounded-md border border-white/10 bg-white/6 p-4'>
        <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Таблица семей</div>
        <div className='mt-3 space-y-3'>
          {summary.overallLeaderboard.length ? (
            summary.overallLeaderboard.map((household, index) => (
              <div
                key={household.householdId}
                className={`grid gap-3 rounded-[1.4rem] border px-4 py-4 sm:grid-cols-[3rem_minmax(0,1.4fr)_auto_auto_auto] ${
                  index === 0
                    ? 'border-amber-300/20 bg-amber-300/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className='text-base font-black text-white/56'>#{index + 1}</div>
                <div className='min-w-0'>
                  <div className='truncate text-base font-semibold text-white'>
                    {household.householdName}
                  </div>
                  <div className='mt-1 text-xs uppercase tracking-[0.18em] text-white/42'>
                    Семейный контур
                  </div>
                </div>
                <div className='text-sm text-white/72'>LVL {household.level}</div>
                <div className='text-sm text-white/72'>{household.totalExp} EXP</div>
                <div className='text-sm text-white/72'>
                  Серия: {household.streakWithoutOverdue}
                </div>
              </div>
            ))
          ) : (
            <div className='text-sm text-white/65'>Пока не из чего строить общий рейтинг семей.</div>
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
