'use client'

import { useEffect, useRef, useState } from 'react'

import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { BonusPurchase, BonusReward } from '@entities/family'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

type BonusShopTab = 'rewards' | 'purchases'
const rewardCarouselCardHeight = 132
const rewardCarouselViewportHeight = 330
const rewardCarouselSpacerHeight = (rewardCarouselViewportHeight - rewardCarouselCardHeight) / 2

type RewardCarouselProps = {
  rewards: BonusReward[]
  activeRewardId: string | null
  onActiveRewardChange: (rewardId: string) => void
  onOpenReward: (reward: BonusReward) => void
}

function RewardCarousel({
  rewards,
  activeRewardId,
  onActiveRewardChange,
  onOpenReward,
}: RewardCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const snapToClosestCard = () => {
    const container = containerRef.current

    if (!container || rewards.length === 0) {
      return
    }

    const nextIndex = Math.min(
      Math.max(Math.round(container.scrollTop / rewardCarouselCardHeight), 0),
      rewards.length - 1,
    )
    const nextReward = rewards[nextIndex]

    if (nextReward && nextReward.id !== activeRewardId) {
      onActiveRewardChange(nextReward.id)
    }

    container.scrollTo({
      top: nextIndex * rewardCarouselCardHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div className='relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-linear-to-b from-white/5 to-white/2 px-3 py-2'>
      <div className='pointer-events-none absolute inset-x-3 top-1/2 z-20 h-33 -translate-y-1/2 rounded-[1.6rem] border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-18 bg-linear-to-b from-[#120f1f] via-[#120f1f]/92 to-transparent' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-18 bg-linear-to-t from-[#120f1f] via-[#120f1f]/92 to-transparent' />
      <div className='pointer-events-none absolute left-1/2 top-0 h-24 w-36 -translate-x-1/2 rounded-full bg-white/8 blur-3xl' />

      <div
        ref={containerRef}
        onScroll={() => {
          if (scrollTimeoutRef.current !== null) {
            window.clearTimeout(scrollTimeoutRef.current)
          }

          scrollTimeoutRef.current = window.setTimeout(snapToClosestCard, 90)
        }}
        className='snap-y snap-mandatory overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
        style={{ height: `${rewardCarouselViewportHeight}px` }}
      >
        <div style={{ height: `${rewardCarouselSpacerHeight}px` }} />

        {rewards.map(reward => {
          const isActive = reward.id === activeRewardId
          const sourceLabel =
            reward.sourceLabel || (reward.id.startsWith('family:') ? 'Ваша семья' : 'Магазин')
          const isHouseholdReward = reward.id.startsWith('family:')

          return (
            <button
              key={reward.id}
              type='button'
              onClick={() => {
                onActiveRewardChange(reward.id)
                onOpenReward(reward)
              }}
              className={`block w-full snap-center text-left transition duration-200 ${
                isActive ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-32 saturate-50'
              }`}
              style={{ height: `${rewardCarouselCardHeight}px` }}
            >
              <div className='overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_rgba(0,0,0,0.28)]'>
                <div
                  className={`relative flex min-h-30 items-start justify-between gap-4 bg-linear-to-br ${getBonusRewardAccentClassName(reward.id)} px-4 py-3.5 text-(--color-page-text)`}
                >
                  <div className='pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/20 to-transparent' />
                  <div className='pointer-events-none absolute -right-8 top-2 h-24 w-24 rounded-full bg-white/18 blur-2xl' />
                  <div className='pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-black/14 blur-3xl' />

                  <div className='relative min-w-0 flex-1'>
                    <div className='flex flex-wrap gap-1.5'>
                      <div
                        className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                          isHouseholdReward
                            ? 'border border-black/12 bg-white/24 text-black/60'
                            : 'border border-black/10 bg-black/12 text-black/58'
                        }`}
                      >
                        {sourceLabel}
                      </div>
                    </div>

                    <div className='mt-3 line-clamp-2 text-base font-black uppercase leading-[0.9] tracking-[-0.04em] text-black/85 sm:text-lg'>
                      {reward.title}
                    </div>

                    <div className='mt-2 line-clamp-2 text-xs leading-4 text-black/62 sm:text-[13px]'>
                      {reward.description || 'Открыть карточку и посмотреть детали награды.'}
                    </div>
                  </div>

                  <div className='relative shrink-0 self-end rounded-[1.1rem] border border-black/10 bg-black/18 px-3 py-2.5 text-right backdrop-blur-md shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'>
                    <div className='text-[9px] font-bold uppercase tracking-[0.22em] text-black/50'>
                      цена
                    </div>
                    <div className='mt-1 text-xl font-black uppercase leading-none text-(--color-brand-home)'>
                      {formatPoints(reward.costUnits)} HC
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        <div style={{ height: `${rewardCarouselSpacerHeight}px` }} />
      </div>
    </div>
  )
}

type BonusShopModalProps = {
  balanceUnits: number
  rewards: BonusReward[]
  purchases: BonusPurchase[]
  loading?: boolean
  onOpenReward: (reward: BonusReward) => void
  onOpenAddElement: () => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  rewards,
  purchases,
  loading = false,
  onOpenReward,
  onOpenAddElement,
  onClose,
}: BonusShopModalProps) {
  const [activeTab, setActiveTab] = useState<BonusShopTab>('rewards')
  const [activeRewardId, setActiveRewardId] = useState<string | null>(rewards[0]?.id ?? null)

  const tabs: Array<{ key: BonusShopTab; label: string }> = [
    { key: 'rewards', label: 'Товары' },
    { key: 'purchases', label: 'Покупки' },
  ]
  const resolvedActiveRewardId =
    activeRewardId && rewards.some(reward => reward.id === activeRewardId)
      ? activeRewardId
      : (rewards[0]?.id ?? null)

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            {loading ? (
              'Магазин бонусов'
            ) : (
              <>
                Магазин бонусов:{' '}
                <span className='text-(--color-brand-home)'>{formatPoints(balanceUnits)}</span> HC
              </>
            )}
          </h2>
        </div>
      </ModalHeader>

      {loading ? (
        <>
          <ModalBody>
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className='overflow-hidden rounded-bl-md rounded-tr-md'
                >
                  <div className='rounded-bl-md rounded-tr-md border border-white/10 bg-white/6 px-4 py-4 sm:px-6'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='skeleton h-10 w-1/2 rounded-full bg-white/15' />
                      <div className='skeleton h-12 w-28 rounded-md bg-white/15' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>

          <ModalFooter className='space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='skeleton h-14 w-full rounded-md bg-white/15' />
              <div className='skeleton h-14 w-full rounded-md bg-white/15' />
            </div>
            <div className='skeleton h-16 w-full rounded-[1.6rem] bg-white/15' />
            <button
              type='button'
              onClick={onClose}
              className='w-full rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-4 text-lg font-semibold text-white transition hover:bg-white/10'
            >
              Закрыть магазин
            </button>
          </ModalFooter>
        </>
      ) : (
        <ModalBody>
          {activeTab === 'rewards' ? (
            rewards.length ? (
              <div className='space-y-3'>
                <div className='px-1 text-center text-[11px] uppercase tracking-[0.28em] text-white/40'>
                  Листай витрину и открывай товар в центре
                </div>

                <RewardCarousel
                  rewards={rewards}
                  activeRewardId={resolvedActiveRewardId}
                  onActiveRewardChange={setActiveRewardId}
                  onOpenReward={onOpenReward}
                />
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
      )}

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
              disabled={loading}
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
