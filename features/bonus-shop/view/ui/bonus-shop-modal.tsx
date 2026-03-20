'use client'

import { useState } from 'react'

import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { BonusPurchase, BonusReward } from '@entities/family'
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

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Магазин бонусов
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        {activeTab === 'rewards' ? (
          rewards.length ? (
            <div className='space-y-3'>
              {rewards.map(reward => {
                return (
                  <button
                    key={reward.id}
                    type='button'
                    onClick={() => setSelectedReward(reward)}
                    className='w-full overflow-hidden rounded-4xl border border-white/10 bg-[#130a1c] text-left shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-transform hover:scale-[0.995]'
                  >
                    <div
                      className={`flex items-start justify-between gap-4 bg-linear-to-br ${getBonusRewardAccentClassName(reward.id)} px-5 py-5 text-(--color-page-text) sm:px-7 sm:py-6`}
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='line-clamp-2 text-3xl font-black uppercase leading-none tracking-tight sm:text-[3.25rem]'>
                          {reward.title}
                        </div>
                      </div>

                      <div className='shrink-0 rounded-[1.4rem] border border-black/8 bg-white/38 px-4 py-3 text-right shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur-sm sm:px-5'>
                        <div className='text-2xl font-black uppercase leading-none text-[#d97f1d] sm:text-3xl'>
                          {formatPoints(reward.costUnits)} HC
                        </div>
                      </div>
                    </div>

                    <div className='grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:gap-6 sm:p-7'>
                      <div className='text-lg leading-8 text-white/92 sm:text-[2rem] sm:leading-[1.15]'>
                        {reward.description || 'Описание пока не добавлено.'}
                      </div>

                      <div className='space-y-3'>
                        <div className='rounded-[1.35rem] border border-white/10 bg-white/6 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.08em] text-white/70'>
                          Открыть товар
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className='rounded-3xl border border-dashed border-white/12 bg-white/4 px-5 py-12 text-center text-sm text-white/60'>
              Магазин пока пуст
            </div>
          )
        ) : (
          <>
            {purchases.length ? (
              <div className='space-y-3'>
                {purchases.map(purchase => (
                  <div
                    key={purchase.id}
                    className='rounded-2xl border border-white/8 bg-white/6 p-4'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <div className='text-sm font-semibold text-white'>
                          {purchase.rewardTitle}
                        </div>
                        <div className='mt-2 text-sm text-white/65'>
                          Списано {formatPoints(purchase.costUnits)} HC
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
          </>
        )}
      </ModalBody>

      <ModalFooter className='space-y-3'>
        <div className='space-y-3'>
          <div className='grid grid-cols-2 gap-2'>
            {tabs.map(tab => (
              <button
                key={tab.key}
                type='button'
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md p-4 text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.key
                    ? 'bg-white text-(--color-page-text) shadow-[0_10px_30px_rgba(255,255,255,0.12)]'
                    : 'text-white/68 hover:bg-white/6 hover:text-white/88 border border-white/10 bg-white/6'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'rewards' ? (
            <button
              type='button'
              onClick={onOpenAddElement}
              className='w-full rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-4 text-lg font-semibold text-white transition hover:bg-white/10'
            >
              Добавить товар
            </button>
          ) : null}

          <button
            type='button'
            onClick={onClose}
            className='w-full rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-4 text-lg font-semibold text-white transition hover:bg-white/10'
          >
            Закрыть магазин
          </button>
        </div>
      </ModalFooter>

      {selectedReward ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-5'>
          <ModalPanel className='max-w-lg'>
            <ModalHeader className='flex items-start justify-between gap-4'>
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

            <ModalBody>
              <div className='space-y-4'>
                <div
                  className={`rounded-2xl bg-linear-to-br ${getBonusRewardAccentClassName(selectedReward.id)} p-5 text-(--color-page-text)`}
                >
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
                    {formatPoints(selectedReward.costUnits)} HC
                  </div>
                  <div className='mt-3 text-sm leading-6 text-white/55'>
                    {balanceUnits >= selectedReward.costUnits
                      ? 'Баланс позволяет купить этот товар.'
                      : 'Сейчас баланса недостаточно для покупки.'}
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className='space-y-3'>
              <div className='space-y-2.5'>
                <button
                  type='button'
                  disabled={balanceUnits < selectedReward.costUnits || !!busyRewardKey}
                  onClick={() => onBuy(selectedReward.id)}
                  className={`w-full rounded-[1.35rem] px-5 py-4 text-lg font-black uppercase tracking-[0.04em] transition ${
                    balanceUnits >= selectedReward.costUnits && !busyRewardKey
                      ? 'bg-[#61b99f] text-[#17342d] hover:brightness-105'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {busyRewardKey === selectedReward.id
                    ? 'Покупаю...'
                    : balanceUnits >= selectedReward.costUnits
                      ? 'Купить'
                      : 'Недостаточно HC'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setSelectedReward(null)
                    onOpenEditReward(selectedReward)
                  }}
                  className='w-full rounded-[1.35rem] bg-[#f0a81e] px-5 py-4 text-lg font-black uppercase tracking-[0.04em] text-[#42321b] transition hover:brightness-105'
                >
                  Изменить
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setSelectedReward(null)
                    onDeleteReward(selectedReward.id)
                  }}
                  className='w-full rounded-[1.35rem] bg-[#ea7778] px-5 py-4 text-lg font-black uppercase tracking-[0.04em] text-[#452020] transition hover:brightness-105'
                >
                  Удалить
                </button>
              </div>
            </ModalFooter>
          </ModalPanel>
        </div>
      ) : null}
    </ModalPanel>
  )
}
