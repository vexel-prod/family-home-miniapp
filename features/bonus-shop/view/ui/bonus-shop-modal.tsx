'use client'

import { useState } from 'react'

import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { BonusPurchase, BonusReward, MonthlyReport } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

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
  const [selectedReward, setSelectedReward] = useState<BonusReward | null>(null)

  const tabs: Array<{ key: BonusShopTab; label: string }> = [
    { key: 'rewards', label: 'Товары' },
    { key: 'purchases', label: 'Покупки' },
    { key: 'reports', label: 'Отчеты' },
  ]

  const selectedRewardCanBuy = selectedReward
    ? balanceUnits >= selectedReward.costUnits && !busyRewardKey
    : false

  return (
    <ModalPanel>
      <ModalHeader className='p-4'>
        <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
          Доступный баланс: {formatPoints(balanceUnits)}
        </h2>
      </ModalHeader>
      <div className='flex-none border-b border-white/10 p-4 sm:p-6'>
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

      <ModalBody>
        {activeTab === 'rewards' && rewards.length ? (
          <>
            {rewards.map(reward => (
              <section
                key={reward.id}
                className='flex items-center justify-center py-2'
              >
                <button
                  type='button'
                  onClick={() => setSelectedReward(reward)}
                  className='w-full overflow-hidden rounded-2xl border border-white/12 bg-white/6 text-left shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition-transform duration-200 active:scale-[0.985]'
                >
                  <div
                    className={`bg-linear-to-r ${getBonusRewardAccentClassName(reward.id)} px-5 py-4 text-(--color-page-text) sm:px-6 sm:py-5`}
                  >
                    <div className='mt-2 line-clamp-2 text-2xl font-semibold leading-tight sm:text-3xl'>
                      {reward.title}
                    </div>
                  </div>

                  <div className='flex flex-1 flex-col justify-between gap-5 p-5 sm:p-6'>
                    <div className='line-clamp-4 max-h-max text-base leading-7 text-white/62'>
                      Открой чтобы посмотреть детали
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <div className='text-[10px] uppercase tracking-[0.24em] text-white/40'>
                          Стоимость
                        </div>
                        <div className='mt-1 text-xl font-semibold text-white sm:text-2xl'>
                          {formatPoints(reward.costUnits)} баллов
                        </div>
                      </div>
                      <div className='rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70'>
                        Открыть
                      </div>
                    </div>
                  </div>
                </button>
              </section>
            ))}
          </>
        ) : (
          <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
            Магазин пока пуст
          </div>
        )}

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
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
          {activeTab === 'rewards' ? (
            <AppButton
              tone='secondary'
              onClick={onOpenAddElement}
            >
              Добавить товар
            </AppButton>
          ) : null}
          <AppButton
            tone='ghost'
            onClick={onClose}
          >
            Закрыть магазин
          </AppButton>
        </div>
      </ModalFooter>

      {selectedReward ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm'>
          <div className='flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-(--color-panel) shadow-2xl'>
            <ModalHeader className='flex items-start justify-between gap-4 p-4 sm:p-5'>
              <div className='min-w-0'>
                <div className='text-[10px] uppercase tracking-[0.24em] text-white/40'>Товар</div>
                <h3 className='mt-2 font-(--font-family-heading) text-xl leading-tight text-white sm:text-2xl'>
                  {selectedReward.title}
                </h3>
              </div>
              <button
                type='button'
                onClick={() => setSelectedReward(null)}
                className='rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition-colors duration-150 hover:bg-white/10'
              >
                Назад
              </button>
            </ModalHeader>

            <ModalBody className='p-4 sm:p-5'>
              <div className='space-y-4'>
                <div
                  className={`rounded-xl bg-linear-to-r ${getBonusRewardAccentClassName(selectedReward.id)} p-4 text-(--color-page-text) sm:p-5`}
                >
                  <div className='text-[10px] uppercase tracking-[0.24em] text-black/55'>
                    Ништячок
                  </div>
                  <div className='mt-2 text-2xl font-semibold leading-tight sm:text-3xl'>
                    {selectedReward.title}
                  </div>
                  <div className='mt-3 text-sm leading-6 text-black/70'>
                    {selectedReward.description || 'Описание пока не добавлено.'}
                  </div>
                </div>

                <div className='rounded-xl border border-white/10 bg-white/6 p-4 sm:p-5'>
                  <div className='text-[10px] uppercase tracking-[0.24em] text-white/40'>
                    Стоимость
                  </div>
                  <div className='mt-2 text-xl font-semibold text-white sm:text-2xl'>
                    {formatPoints(selectedReward.costUnits)} баллов
                  </div>
                  <div className='mt-3 text-sm leading-6 text-white/55'>
                    {balanceUnits >= selectedReward.costUnits
                      ? 'Баланс позволяет купить этот товар.'
                      : 'Сейчас баланса недостаточно для покупки.'}
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className='p-4 sm:p-5'>
              <div className='space-y-2.5'>
                <AppButton
                  tone={selectedRewardCanBuy ? 'home' : 'secondary'}
                  disabled={!selectedRewardCanBuy}
                  onClick={() => onBuy(selectedReward.id)}
                >
                  {busyRewardKey === selectedReward.id
                    ? 'Покупаю...'
                    : selectedRewardCanBuy
                      ? 'Купить'
                      : 'Недостаточно баллов'}
                </AppButton>
                <AppButton
                  tone='ghost'
                  onClick={() => {
                    setSelectedReward(null)
                    onOpenEditReward(selectedReward)
                  }}
                >
                  Редактировать
                </AppButton>
                <AppButton
                  tone='ghost'
                  onClick={() => {
                    setSelectedReward(null)
                    onDeleteReward(selectedReward.id)
                  }}
                >
                  Удалить
                </AppButton>
              </div>
            </ModalFooter>
          </div>
        </div>
      ) : null}
    </ModalPanel>
  )
}
