'use client'

import { useState } from 'react'

import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { TextInput } from '@/components/ui/form-field'
import { formatRelativeDate } from '@/shared/lib/format'
import { PROFILE_LEVEL_BONUS_POINTS } from '@/shared/lib/household-profile'
import type { HouseholdProfile, HouseholdSummary } from '@/shared/types/family'

type ProfileTab = 'progress' | 'family' | 'history'

type HouseholdProfileModalProps = {
  actorName: string
  profile: HouseholdProfile
  household: HouseholdSummary
  customInviteCode: string
  busyAction: string | null
  onCustomInviteCodeChange: (value: string) => void
  onCopyInvite: () => void
  onCreateCustomInvite: () => void
  onReissueInvite: () => void
  onLeaveHousehold: () => void
  onRemoveMember: (memberId: string) => void
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

export function HouseholdProfileModal({
  actorName,
  profile,
  household,
  customInviteCode,
  busyAction,
  onCustomInviteCodeChange,
  onCopyInvite,
  onCreateCustomInvite,
  onReissueInvite,
  onLeaveHousehold,
  onRemoveMember,
  onClose,
}: HouseholdProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('progress')
  const tabs: Array<{ key: ProfileTab; label: string }> = [
    { key: 'progress', label: 'Прогресс' },
    { key: 'family', label: 'Семья' },
    { key: 'history', label: 'История' },
  ]

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

        <div className='mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'border-transparent bg-white text-(--color-page-text) shadow-(--shadow-card)'
                  : 'border-white/10 bg-white/6 text-white/75 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {activeTab === 'progress' ? (
          <div className='space-y-4'>
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

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-md border border-white/10 bg-white/6 p-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                  Бонус от уровней
                </div>
                <div className='mt-2 text-2xl font-semibold text-white'>
                  {profile.currentLevel * PROFILE_LEVEL_BONUS_POINTS}
                </div>
              </div>
              <div className='rounded-md border border-white/10 bg-white/6 p-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                  Всего закрыто
                </div>
                <div className='mt-2 text-2xl font-semibold text-white'>
                  {profile.completedTasksCount}
                </div>
              </div>
              <div className='rounded-md border border-white/10 bg-emerald-400/10 p-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-emerald-100/55'>
                  Быстрые задачи
                </div>
                <div className='mt-2 text-2xl font-semibold text-emerald-50'>
                  {profile.fastTasksCount}
                </div>
              </div>
              <div className='rounded-md border border-white/10 bg-rose-400/10 p-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-rose-100/55'>
                  Просрочки
                </div>
                <div className='mt-2 text-2xl font-semibold text-rose-50'>
                  {profile.overdueTasksCount}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'family' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/6'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              Семья
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Семья</div>
                  <div className='mt-2 text-2xl font-(--font-family-heading) text-white'>
                    {household.name}
                  </div>
                  <div className='mt-2 text-sm text-white/65'>
                    Текущая роль: {household.currentUserRole === 'head' ? 'глава семьи' : 'участник'}
                  </div>
                </div>

                <div className='rounded-md border border-white/10 bg-black/15 px-4 py-3 text-right'>
                  <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Инвайт-код</div>
                  <div className='mt-2 text-2xl font-semibold text-white'>
                    {household.activeInvite?.code ?? 'Нет кода'}
                  </div>
                  <div className='mt-2 text-xs text-white/45'>
                    {household.activeInvite
                      ? `Действует до ${formatRelativeDate(household.activeInvite.expiresAt)}`
                      : 'Перевыпусти код для новых приглашений'}
                  </div>
                </div>
              </div>

              <div className='mt-5 flex flex-wrap gap-3'>
                {household.activeInvite ? (
                  <AppButton
                    tone='light'
                    className='w-auto min-w-40'
                    disabled={busyAction !== null}
                    onClick={onCopyInvite}
                  >
                    {busyAction === 'copy-invite' ? 'Копирую...' : 'Скопировать код'}
                  </AppButton>
                ) : null}

                {household.currentUserRole === 'head' ? (
                  <>
                    <div className='min-w-[16rem] flex-1'>
                      <TextInput
                        value={customInviteCode}
                        placeholder='Свой код, например HOUSE777'
                        disabled={busyAction !== null}
                        onChange={event => onCustomInviteCodeChange(event.target.value)}
                      />
                    </div>
                    <AppButton
                      tone='secondary'
                      className='w-auto min-w-44'
                      disabled={busyAction !== null || !customInviteCode.trim()}
                      onClick={onCreateCustomInvite}
                    >
                      {busyAction === 'custom-invite' ? 'Сохраняю код...' : 'Сохранить свой код'}
                    </AppButton>
                    <AppButton
                      tone='secondary'
                      className='w-auto min-w-44'
                      disabled={busyAction !== null}
                      onClick={onReissueInvite}
                    >
                      {busyAction === 'reissue-invite' ? 'Обновляю код...' : 'Сгенерировать новый'}
                    </AppButton>
                  </>
                ) : null}

                <AppButton
                  tone='ghost'
                  className='min-w-40'
                  disabled={busyAction !== null}
                  onClick={onLeaveHousehold}
                >
                  {busyAction === 'leave-household' ? 'Выхожу...' : 'Покинуть семью'}
                </AppButton>
              </div>

              <div className='mt-5 space-y-3'>
                {household.members.map(member => (
                  <div
                    key={member.id}
                    className='flex flex-col gap-3 rounded-md border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between'
                  >
                    <div>
                      <div className='text-sm font-semibold text-white'>
                        {member.displayName}
                        {member.isCurrentUser ? ' • это ты' : ''}
                      </div>
                      <div className='mt-2 text-xs text-white/45'>
                        {member.role === 'head' ? 'Глава семьи' : 'Участник'} • в семье {formatRelativeDate(member.joinedAt)}
                      </div>
                    </div>

                    {household.currentUserRole === 'head' && !member.isCurrentUser ? (
                      <AppButton
                        tone='danger'
                        className='w-auto min-w-40'
                        disabled={busyAction !== null}
                        onClick={() => onRemoveMember(member.id)}
                      >
                        {busyAction === `remove-member-${member.id}` ? 'Удаляю...' : 'Удалить из семьи'}
                      </AppButton>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'history' ? (
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
        ) : null}
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
