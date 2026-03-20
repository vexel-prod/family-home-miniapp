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
  onOpenReward: (reward: BonusReward) => void
  onOpenAddElement: () => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  rewards,
  purchases,
  onOpenReward,
  onOpenAddElement,
  onClose,
}: BonusShopModalProps) {
  const [activeTab, setActiveTab] = useState<BonusShopTab>('rewards')

  const tabs: Array<{ key: BonusShopTab; label: string }> = [
    { key: 'rewards', label: 'Товары' },
    { key: 'purchases', label: 'Покупки' },
  ]

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Магазин бонусов:{' '}
            <span className='text-(--color-brand-home)'>{formatPoints(balanceUnits)}</span> HC
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        {activeTab === 'rewards' ? (
          rewards.length ? (
            <div className='space-y-4'>
              {rewards.map(reward => (
                <button
                  key={reward.id}
                  type='button'
                  onClick={() => onOpenReward(reward)}
                  className='w-full inset-shadow-2xs overflow-hidden text-left shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-transform hover:scale-[0.995]'
                >
                  <div
                    className={`flex items-center justify-between gap-4 bg-linear-to-br ${getBonusRewardAccentClassName(reward.id)} px-4 py-2 text-(--color-page-text) sm:px-6 sm:py-4 rounded-bl-md rounded-tr-md`}
                  >
                    <div className='line-clamp-2 text-md font-black uppercase leading-none tracking-tight sm:text-[3.25rem]'>
                      {reward.title}
                    </div>

                    <div className='shrink-0 rounded-md border border-white/10 bg-black/40 px-4 py-3 text-right backdrop-blur-md sm:px-5 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
                      <div className='text-2xl font-black uppercase leading-none text-(--color-brand-home) sm:text-2xl'>
                        {formatPoints(reward.costUnits)} HC
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className='rounded-3xl border border-dashed border-white/12 bg-white/4 px-5 py-12 text-center text-sm text-white/60'>
              Магазин пока пуст
            </div>
          )
        ) : purchases.length ? (
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
                    : 'border border-white/10 bg-white/6 text-white/68 hover:bg-white/6 hover:text-white/88'
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
    </ModalPanel>
  )
}
