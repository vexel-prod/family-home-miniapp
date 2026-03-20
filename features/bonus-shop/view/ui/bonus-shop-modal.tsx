'use client'

import { useState } from 'react'

import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { BonusPurchase, BonusReward } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

type BonusShopTab = 'rewards' | 'purchases'

type BonusShopModalProps = {
  balanceUnits: number
  rewards: BonusReward[]
  purchases: BonusPurchase[]
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
  ]

  const selectedRewardCanBuy = selectedReward
    ? balanceUnits >= selectedReward.costUnits && !busyRewardKey
    : false

  return (
    <ModalPanel className='max-w-4xl'>
      <ModalHeader className='p-5 sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <div className='text-[11px] uppercase tracking-[0.28em] text-white/35'>
              Bonus Shop
            </div>
            <h2 className='mt-3 font-(--font-family-heading) text-3xl leading-none text-white sm:text-4xl'>
              Семейные бонусы
            </h2>
            <div className='mt-3 max-w-xl text-sm leading-6 text-white/55'>
              Выбирай награды, отслеживай покупки и держи под рукой отчеты семьи.
            </div>
          </div>

          <div className='rounded-2xl border border-white/10 bg-white/6 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'>
            <div className='text-[10px] uppercase tracking-[0.26em] text-white/40'>Доступно</div>
            <div className='mt-2 text-2xl font-semibold text-white sm:text-3xl'>
              {formatPoints(balanceUnits)}
            </div>
            <div className='mt-1 text-xs text-white/45'>баллов на счету</div>
          </div>
        </div>
      </ModalHeader>

      <div className='flex-none border-b border-white/10 p-4 sm:p-6'>
        <div className='grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-white text-(--color-page-text) shadow-[0_10px_30px_rgba(255,255,255,0.12)]'
                  : 'text-white/68 hover:bg-white/6 hover:text-white/88'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ModalBody className='p-4 sm:p-6'>
        {activeTab === 'rewards' ? (
          rewards.length ? (
            <div className='space-y-4'>
              <div className='rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-[10px] uppercase tracking-[0.26em] text-white/38'>
                      Витрина
                    </div>
                    <div className='mt-2 text-lg font-semibold text-white'>
                      Листай по одной карточке
                    </div>
                  </div>
                  <div className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55'>
                    {rewards.length} шт.
                  </div>
                </div>
              </div>

              <div className='h-[26rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-3 sm:h-[30rem] sm:p-4'>
                <div className='h-full overflow-y-auto overscroll-y-contain snap-y snap-mandatory scroll-smooth pr-1'>
                  {rewards.map(reward => (
                    <section
                      key={reward.id}
                      className='flex min-h-[84%] snap-center snap-always items-center justify-center py-2 sm:min-h-[86%]'
                    >
                      <button
                        type='button'
                        onClick={() => setSelectedReward(reward)}
                        className='w-full overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] text-left shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition-transform duration-200 active:scale-[0.985]'
                      >
                        <div
                          className={`bg-linear-to-br ${getBonusRewardAccentClassName(reward.id)} px-5 py-5 text-(--color-page-text) sm:px-6 sm:py-6`}
                        >
                          <div className='text-[10px] uppercase tracking-[0.26em] text-black/45'>
                            Ништячок
                          </div>
                          <div className='mt-3 line-clamp-2 text-2xl font-semibold leading-tight sm:text-3xl'>
                            {reward.title}
                          </div>
                        </div>

                        <div className='flex flex-1 flex-col justify-between gap-5 p-5 sm:p-6'>
                          <div className='line-clamp-4 min-h-24 text-base leading-7 text-white/62'>
                            {reward.description || 'Открой карточку, чтобы посмотреть детали и действия.'}
                          </div>
                          <div className='flex items-end justify-between gap-3'>
                            <div>
                              <div className='text-[10px] uppercase tracking-[0.24em] text-white/40'>
                                Стоимость
                              </div>
                              <div className='mt-1 text-2xl font-semibold text-white'>
                                {formatPoints(reward.costUnits)} баллов
                              </div>
                            </div>
                            <div className='rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/72'>
                              Открыть
                            </div>
                          </div>
                        </div>
                      </button>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='flex h-full items-center justify-center'>
              <div className='w-full rounded-3xl border border-dashed border-white/12 bg-white/4 px-5 py-12 text-center text-sm text-white/60'>
                Магазин пока пуст
              </div>
            </div>
          )
        ) : null}

        {activeTab === 'purchases' ? (
          <div className='flex min-h-0 flex-col rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]'>
            <div className='border-b border-white/10 p-4 text-[10px] uppercase tracking-[0.28em] text-white/40'>
              История покупок
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {purchases.length ? (
                <div className='space-y-3'>
                  {purchases.map(purchase => (
                    <div
                      key={purchase.id}
                      className='rounded-2xl border border-white/8 bg-white/6 p-4'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <div className='text-sm font-semibold text-white'>{purchase.rewardTitle}</div>
                          <div className='mt-2 text-sm text-white/65'>
                            Списано {formatPoints(purchase.costUnits)} баллов
                          </div>
                        </div>
                        <div className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45'>
                          Покупка
                        </div>
                      </div>
                      <div className='mt-3 text-xs text-white/42'>
                        {formatRelativeDate(purchase.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-10 text-center text-sm text-white/60'>
                  Пока нет покупок
                </div>
              )}
            </div>
          </div>
        ) : null}

      </ModalBody>

      <ModalFooter className='p-4 sm:p-6'>
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
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-5'>
          <div className='flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(27,22,40,0.98),rgba(18,15,29,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]'>
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
                  className={`rounded-2xl bg-linear-to-br ${getBonusRewardAccentClassName(selectedReward.id)} p-5 text-(--color-page-text)`}
                >
                  <div className='text-[10px] uppercase tracking-[0.24em] text-black/55'>
                    Ништячок
                  </div>
                  <div className='mt-3 text-2xl font-semibold leading-tight sm:text-3xl'>
                    {selectedReward.title}
                  </div>
                  <div className='mt-3 text-sm leading-6 text-black/70'>
                    {selectedReward.description || 'Описание пока не добавлено.'}
                  </div>
                </div>

                <div className='rounded-2xl border border-white/10 bg-white/6 p-4 sm:p-5'>
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
