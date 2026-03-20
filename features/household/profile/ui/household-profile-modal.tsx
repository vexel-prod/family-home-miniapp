'use client'

import { useState } from 'react'

import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'
import { TextInput } from '@shared/ui/form-field'
import { formatPoints } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { FamilyGoal, HouseholdProfile, HouseholdSummary } from '@entities/family'

type ProfileTab = 'progress' | 'family' | 'goal' | 'history'

type HouseholdProfileModalProps = {
  actorName: string
  profile: HouseholdProfile
  household: HouseholdSummary
  familyGoal: FamilyGoal | null
  customInviteCode: string
  busyAction: string | null
  onCustomInviteCodeChange: (value: string) => void
  onCopyInvite: () => void
  onCreateCustomInvite: () => void
  onReissueInvite: () => void
  onOpenEditGoal: () => void
  onLeaveHousehold: () => void
  onClearGoal: () => void
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

function getVariantLabel(variant: HouseholdProfile['recentEvents'][number]['variant']) {
  if (variant === 'fast') {
    return `Быстрое выполнение: `
  }

  if (variant === 'overdue') {
    return `Просрочка: `
  }

  return `Базовое выполнение: `
}

export function HouseholdProfileModal({
  profile,
  household,
  familyGoal,
  customInviteCode,
  busyAction,
  onCustomInviteCodeChange,
  onCopyInvite,
  onCreateCustomInvite,
  onReissueInvite,
  onOpenEditGoal,
  onLeaveHousehold,
  onClearGoal,
  onRemoveMember,
  onClose,
}: HouseholdProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('progress')
  const familyGoalProgress = familyGoal
    ? Math.min(
        100,
        Math.round((familyGoal.currentValue / Math.max(familyGoal.targetValue, 1)) * 100),
      )
    : 0
  const tabs: Array<{ key: ProfileTab; label: string }> = [
    { key: 'progress', label: 'Прогресс' },
    { key: 'family', label: 'Семья' },
    { key: 'goal', label: 'Цель' },
    { key: 'history', label: 'История' },
  ]

  return (
    <ModalPanel>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              {household.name} LVL {profile.currentLevel}
            </h2>
          </div>
        </div>

        <div className='mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md border px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
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
                    Общий уровень семьи
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
                exp начисляется в общий уровень семьи
                <br />
                обычная задача +10 exp
                <br />
                быстрая +15 exp
                <br />
                просроченная -15 exp.
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-md border border-white/10 bg-white/6 p-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Твой баланс</div>
                <div className='mt-2 text-2xl font-semibold text-white'>
                  {formatPoints(profile.bonusBalanceUnits)} HC
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
            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <div className='mt-2 text-2xl font-(--font-family-heading) text-white'>
                    {household.name}
                  </div>
                  <div className='mt-2 text-sm text-white/65'>
                    Текущая роль:{' '}
                    {household.currentUserRole === 'head' ? 'глава семьи' : 'участник'}
                  </div>
                </div>

                <div className='rounded-md border border-white/10 bg-black/15 px-4 py-3 text-right'>
                  <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                    Инвайт-код
                  </div>
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
                      <div className='text-sm font-semibold text-white'>{member.displayName}</div>
                      <div className='mt-2 text-xs text-white/45'>
                        {member.role === 'head' ? 'Глава семьи' : 'Участник'} — в семье с{' '}
                        {formatRelativeDate(member.joinedAt)}
                      </div>
                    </div>

                    {household.currentUserRole === 'head' && !member.isCurrentUser ? (
                      <AppButton
                        tone='danger'
                        className='w-auto min-w-40'
                        disabled={busyAction !== null}
                        onClick={() => onRemoveMember(member.id)}
                      >
                        {busyAction === `remove-member-${member.id}`
                          ? 'Удаляю...'
                          : 'Удалить из семьи'}
                      </AppButton>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'goal' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/6'>
            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {familyGoal ? (
                <div className='space-y-4'>
                  <div>
                    <div className='text-sm text-white/45'>
                      {familyGoal.kind === 'spiritual' ? 'Для души' : 'Покупка'}
                    </div>
                    <div className='mt-2 text-2xl font-(--font-family-heading) text-white'>
                      {familyGoal.title}
                    </div>
                    {familyGoal.description ? (
                      <div className='mt-3 text-sm leading-6 text-white/65'>
                        {familyGoal.description}
                      </div>
                    ) : null}
                  </div>

                  <div className='rounded-md border border-white/10 bg-black/15 p-4'>
                    <div className='mb-2 flex items-center justify-between gap-3 text-sm text-white/65'>
                      <span>
                        {familyGoal.currentValue} / {familyGoal.targetValue}{' '}
                        {familyGoal.kind === 'material'
                          ? familyGoal.unitLabel || 'ед.'
                          : 'общих HC'}
                      </span>
                      <span>{familyGoalProgress}%</span>
                    </div>
                    <div className='h-3 overflow-hidden rounded-full bg-white/10'>
                      <div
                        className='h-full rounded-full bg-white transition-all duration-300'
                        style={{ width: `${familyGoalProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-3'>
                    <AppButton
                      tone='secondary'
                      className='w-auto min-w-44'
                      disabled={busyAction !== null}
                      onClick={onOpenEditGoal}
                    >
                      Редактировать цель
                    </AppButton>
                    <AppButton
                      tone='ghost'
                      className='min-w-40'
                      disabled={busyAction !== null}
                      onClick={onClearGoal}
                    >
                      {busyAction === 'clear-family-goal' ? 'Убираю...' : 'Убрать цель'}
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                    Пока нет общей цели семьи.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <>
            {profile.recentEvents.length ? (
              <div className='flex flex-col gap-4'>
                {profile.recentEvents.map(event => (
                  <div
                    key={event.id}
                    className='rounded-md border border-white/10 bg-black/15 p-4'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <div className='text-sm font-semibold text-white'>{event.title}</div>
                        <div className='mt-2 text-sm text-white/65'>
                          {getVariantLabel(event.variant)}
                          <span
                            className={`${event.expDelta > 0 ? 'text-emerald-300' : 'text-rose-400'} font-black`}
                          >
                            {event.expDelta > 0 ? '+' : '-'}
                            {event.expDelta}
                          </span>
                          exp
                        </div>
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
                Как только появятся выполненные задачи, здесь появится история семейного прогресса.
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6 space-y-3'>
        {activeTab === 'goal' && (
          <AppButton
            tone='secondary'
            className='w-auto min-w-44'
            disabled={busyAction !== null}
            onClick={onOpenEditGoal}
          >
            Создать цель
          </AppButton>
        )}
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
