'use client'

import { useState } from 'react'

import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { BonusPurchase, BonusReward, MonthlyReport } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'

type BonusShopTab = 'rewards' | 'purchases' | 'reports'

type BonusShopModalProps = {
  balanceUnits: number
  rewards: BonusReward[]
  purchases: BonusPurchase[]
  reports: MonthlyReport[]
  busyRewardKey: string | null
  onBuy: (rewardKey: string) => void
  onOpenAddElement: () => void
  onOpenEditReward: (reward: BonusReward) => void
  onDeleteReward: (rewardId: string) => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  rewards,
  purchases,
  reports,
  busyRewardKey,
  onBuy,
  onOpenAddElement,
  onOpenEditReward,
  onDeleteReward,
  onClose,
}: BonusShopModalProps) {
  const [activeTab, setActiveTab] = useState<BonusShopTab>('rewards')

  const tabs: Array<{ key: BonusShopTab; label: string }> = [
    { key: 'rewards', label: 'Товары' },
    { key: 'purchases', label: 'Покупки' },
    { key: 'reports', label: 'Отчеты' },
  ]

  return (
    <ModalPanel>
      <div className='p-4 border-b border-white/10'>
        <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
          Доступный баланс: {formatPoints(balanceUnits)}
        </h2>
      </div>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
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
                            Ништячок
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

                          <div className='flex flex-wrap justify-end gap-2 sm:max-w-88'>
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
                  Магазин пока пуст
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
                  Пока нет покупок
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'reports' ? (
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              ежемесячные отчеты
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
                  Отчеты появятся в конце месяца
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
