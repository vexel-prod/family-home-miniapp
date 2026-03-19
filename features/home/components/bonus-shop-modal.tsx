'use client'

import { useState } from 'react'

import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { formatPoints, getBonusRewardAccentClassName } from '@/shared/lib/bonus-shop'
import { formatRelativeDate } from '@/shared/lib/format'
import type { BonusPurchase, BonusReward, FamilyGoal, MonthlyReport } from '@/shared/types/family'

type BonusShopTab = 'rewards' | 'goal' | 'purchases' | 'reports'

type BonusShopModalProps = {
  balanceUnits: number
  rewards: BonusReward[]
  familyGoal: FamilyGoal | null
  purchases: BonusPurchase[]
  reports: MonthlyReport[]
  busyRewardKey: string | null
  onBuy: (rewardKey: string) => void
  onOpenAddElement: () => void
  onOpenEditReward: (reward: BonusReward) => void
  onOpenEditGoal: () => void
  onDeleteReward: (rewardId: string) => void
  onClearGoal: () => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  rewards,
  familyGoal,
  purchases,
  reports,
  busyRewardKey,
  onBuy,
  onOpenAddElement,
  onOpenEditReward,
  onOpenEditGoal,
  onDeleteReward,
  onClearGoal,
  onClose,
}: BonusShopModalProps) {
  const [activeTab, setActiveTab] = useState<BonusShopTab>('rewards')
  const familyGoalProgress = familyGoal
    ? Math.min(
        100,
        Math.round((familyGoal.currentValue / Math.max(familyGoal.targetValue, 1)) * 100),
      )
    : 0

  const tabs: Array<{ key: BonusShopTab; label: string }> = [
    { key: 'rewards', label: 'Товары' },
    { key: 'goal', label: 'Цель' },
    { key: 'purchases', label: 'Покупки' },
    { key: 'reports', label: 'Отчеты' },
  ]

  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              Доступный баланс: {formatPoints(balanceUnits)}
            </h2>
          </div>
          <div className='max-w-sm rounded-md bg-white/5 px-4 py-3 text-sm text-white/70 sm:text-right'>
            Бонусы действуют только до конца текущего месяца
          </div>
        </div>

        <div className='mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
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
        {activeTab === 'goal' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              Семейная цель
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {familyGoal ? (
                <div className='space-y-3'>
                  <div>
                    <div className='text-sm text-white/45'>
                      {familyGoal.kind === 'spiritual' ? 'Для души' : 'Покупка'}
                    </div>
                    <div className='mt-2 text-xl font-semibold text-white'>{familyGoal.title}</div>
                    {familyGoal.description ? (
                      <div className='mt-2 text-sm leading-6 text-white/65'>
                        {familyGoal.description}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className='mb-2 flex items-center justify-between gap-3 text-sm text-white/65'>
                      <span>
                        {familyGoal.currentValue} / {familyGoal.targetValue}{' '}
                        {familyGoal.kind === 'material'
                          ? familyGoal.unitLabel || 'ед.'
                          : 'общих баллов'}
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
                      className='w-auto px-4 py-3 text-sm'
                      onClick={onOpenEditGoal}
                    >
                      Редактировать цель
                    </AppButton>
                    <AppButton
                      tone='ghost'
                      onClick={onClearGoal}
                    >
                      Убрать цель
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Пока нет общей цели семьи.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'rewards' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              Семейные товары
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {rewards.length ? (
                <div className='space-y-4'>
                  {rewards.map(reward => {
                    const canBuy = balanceUnits >= reward.costUnits && !busyRewardKey

                    return (
                      <div
                        key={reward.id}
                        className='overflow-hidden rounded-md border border-white/10 bg-white/5'
                      >
                        <div
                          className={`bg-linear-to-r ${getBonusRewardAccentClassName(reward.id)} p-5 text-(--color-page-text)`}
                        >
                          <div className='text-xs uppercase tracking-[0.24em] text-black/55'>
                            Семейный ништяк
                          </div>
                          <div className='mt-3 text-2xl font-semibold'>{reward.title}</div>
                          <div className='mt-2 max-w-xl text-sm text-black/70'>
                            {reward.description}
                          </div>
                        </div>

                        <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between'>
                          <div>
                            <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                              Стоимость
                            </div>
                            <div className='mt-2 text-xl font-semibold text-white'>
                              {formatPoints(reward.costUnits)} баллов
                            </div>
                          </div>

                          <div className='flex flex-wrap justify-end gap-2 sm:max-w-[22rem]'>
                            <AppButton
                              tone={canBuy ? 'home' : 'secondary'}
                              disabled={!canBuy}
                              onClick={() => onBuy(reward.id)}
                              className='w-auto px-4 py-3 text-xs'
                            >
                              {busyRewardKey === reward.id
                                ? 'Покупаю...'
                                : canBuy
                                  ? 'Купить'
                                  : 'Недостаточно'}
                            </AppButton>
                            <AppButton
                              tone='ghost'
                              className='w-auto px-4 py-3 text-xs'
                              onClick={() => onOpenEditReward(reward)}
                            >
                              Изменить
                            </AppButton>
                            <AppButton
                              tone='ghost'
                              className='w-auto px-4 py-3 text-xs'
                              onClick={() => onDeleteReward(reward.id)}
                            >
                              Удалить
                            </AppButton>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Магазин пока пуст.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'purchases' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              История покупок
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {purchases.length ? (
                <div className='space-y-3'>
                  {purchases.map(purchase => (
                    <div
                      key={purchase.id}
                      className='rounded-md bg-white/6 p-4'
                    >
                      <div className='text-sm font-semibold text-white'>{purchase.rewardTitle}</div>
                      <div className='mt-2 text-sm text-white/65'>
                        Списано {formatPoints(purchase.costUnits)} баллов
                      </div>
                      <div className='mt-2 text-xs text-white/45'>
                        {formatRelativeDate(purchase.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Пока нет покупок в этом месяце.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'reports' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              Месячные отчеты
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {reports.length ? (
                <div className='space-y-3'>
                  {reports.map(report => (
                    <div
                      key={report.id}
                      className='rounded-md bg-white/6 p-4'
                    >
                      <div className='text-sm font-semibold text-white'>{report.title}</div>
                      <div className='mt-2 whitespace-pre-line text-sm leading-6 text-white/65'>
                        {report.reportBody}
                      </div>
                      <div className='mt-2 text-xs text-white/45'>
                        {report.sentAt
                          ? `Отправлен: ${formatRelativeDate(report.sentAt)}`
                          : 'Сохранен в базе'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Отчеты появятся после закрытия месяца.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className='space-y-3 border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='secondary'
          onClick={onOpenAddElement}
        >
          Добавить элемент
        </AppButton>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть магазин
        </AppButton>
      </div>
    </ModalPanel>
  )
}
