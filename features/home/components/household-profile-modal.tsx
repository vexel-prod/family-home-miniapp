import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { formatRelativeDate } from '@/shared/lib/format'
import { PROFILE_LEVEL_BONUS_POINTS } from '@/shared/lib/household-profile'
import { formatPoints } from '@/shared/lib/bonus-shop'
import type { HouseholdProfile } from '@/shared/types/family'

type HouseholdProfileModalProps = {
  actorName: string
  profile: HouseholdProfile
  onClose: () => void
}

function getProgressPercent(profile: HouseholdProfile) {
  const levelRange = profile.nextLevelThreshold - profile.currentLevelThreshold

  if (levelRange <= 0) {
    return 100
  }

  return Math.max(0, Math.min(100, (profile.expIntoCurrentLevel / levelRange) * 100))
}

function getVariantLabel(
  variant: HouseholdProfile['recentEvents'][number]['variant'],
  expDelta: number,
) {
  if (variant === 'fast') {
    return `Быстрое выполнение: +${expDelta} exp`
  }

  if (variant === 'overdue') {
    return `${expDelta} exp за просрочку`
  }

  return `Базовое выполнение: +${expDelta} exp`
}

export function HouseholdProfileModal({ actorName, profile, onClose }: HouseholdProfileModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              {actorName} LVL {profile.currentLevel}
            </h2>
          </div>
        </div>
      </div>

      <div className='max-h-[40dvh] overflow-auto grid flex-1 gap-4 p-4 sm:grid-cols-[0.95fr_1.05fr] sm:p-6'>
        <div className='grid min-h-0 gap-4'>
          <div className='flex flex-col gap-2 rounded-md border border-white/10 bg-white/6 p-5'>
            <div className='flex items-end justify-between gap-4'>
              <div>
                <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                  Прогресс уровня
                </div>
                <div className='mt-3 text-3xl font-semibold text-white'>
                  {profile.totalExp} / {profile.nextLevelThreshold} exp
                </div>
              </div>
              <div className='text-right text-sm text-white/65'>
                До LVL {profile.nextLevel}: {profile.expToNextLevel} exp
              </div>
            </div>

            <div className='mt-5 h-3 overflow-hidden rounded-full bg-white/10'>
              <div
                className='h-full rounded-full bg-linear-to-r from-[#f7d77b] via-[#f59e0b] to-[#fb7185]'
                style={{ width: `${getProgressPercent(profile)}%` }}
              />
            </div>
            <div className='mt-2 rounded-md border border-white/10 bg-white/6 px-4 py-4 text-xs text-white/70'>
              обычная задача +10 exp
              <br />
              быстрая +15 exp
              <br />
              просроченная -15 exp.
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='rounded-md border border-white/10 bg-white/6 p-5'>
              <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                Бонус от уровней
              </div>
              <div className='mt-3 text-3xl font-semibold text-white'>
                {profile.currentLevel * PROFILE_LEVEL_BONUS_POINTS}
              </div>
            </div>
            <div className='rounded-md border border-white/10 bg-white/6 p-5'>
              <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Всего закрыто</div>
              <div className='mt-3 text-3xl font-semibold text-white'>
                {profile.completedTasksCount}
              </div>
            </div>
            <div className='rounded-md border border-white/10 bg-emerald-400/10 p-5'>
              <div className='text-xs uppercase tracking-[0.24em] text-emerald-100/55'>
                Быстрые задачи
              </div>
              <div className='mt-3 text-3xl font-semibold text-emerald-50'>
                {profile.fastTasksCount}
              </div>
            </div>
            <div className='rounded-md border border-white/10 bg-rose-400/10 p-5'>
              <div className='text-xs uppercase tracking-[0.24em] text-rose-100/55'>Просрочки</div>
              <div className='mt-3 text-3xl font-semibold text-rose-50'>
                {profile.overdueTasksCount}
              </div>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/6'>
          <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
            Последние изменения опыта
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto p-4'>
            {profile.recentEvents.length ? (
              <div className='space-y-3'>
                {profile.recentEvents.map(event => (
                  <div
                    key={event.id}
                    className='rounded-xl border border-white/10 bg-black/15 p-4'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <div className='text-sm font-semibold text-white'>{event.title}</div>
                        <div className='mt-2 text-sm text-white/65'>
                          {getVariantLabel(event.variant, event.expDelta)}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          event.expDelta >= 0
                            ? 'bg-emerald-400/12 text-emerald-100'
                            : 'bg-rose-400/12 text-rose-100'
                        }`}
                      >
                        {event.expDelta > 0 ? '+' : ''}
                        {event.expDelta} exp
                      </div>
                    </div>
                    <div className='mt-3 text-xs text-white/45'>
                      {formatRelativeDate(event.completedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                Как только появятся выполненные задачи, здесь начнет копиться опыт.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть кабинет
        </AppButton>
      </div>
    </ModalPanel>
  )
}
