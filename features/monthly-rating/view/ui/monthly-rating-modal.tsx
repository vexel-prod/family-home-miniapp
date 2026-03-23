import { useState } from 'react'

import type { MonthlyRatingSummary } from '@entities/monthly-rating'
import { MonthlyRatingBoard, OverallHouseholdLeaderboardBoard } from '@entities/monthly-rating'
import { AppButton } from '@shared/ui/app-button'
import { ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

type MonthlyRatingModalProps = {
  summary: MonthlyRatingSummary
  loading?: boolean
  onClose: () => void
}

export function MonthlyRatingModal({ summary, loading = false, onClose }: MonthlyRatingModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'overall'>('personal')

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            {loading ? (
              <span
                aria-hidden='true'
                className='skeleton inline-flex h-6 w-44 rounded-full align-middle bg-white/15'
              />
            ) : (
              `Лидерство за ${summary.monthLabel}`
            )}
          </h2>
        </div>
      </ModalHeader>

      {loading ? (
        <div className='flex-1 space-y-4 p-4 sm:p-6'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className='rounded-md border border-white/10 bg-white/6 p-4'
            >
              <div className='flex items-center justify-between gap-4'>
                <div className='skeleton h-6 w-32 rounded-full bg-white/15' />
                <div className='skeleton h-6 w-16 rounded-full bg-white/15' />
              </div>
              <div className='mt-3 skeleton h-3 w-full rounded-full bg-white/15' />
            </div>
          ))}
        </div>
      ) : activeTab === 'personal' ? (
        <MonthlyRatingBoard summary={summary} />
      ) : (
        <OverallHouseholdLeaderboardBoard summary={summary} />
      )}

      <ModalFooter className='space-y-3'>
        <div className='grid grid-cols-2 gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('personal')}
            className={`rounded-md border border-white/10 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'personal'
                ? 'bg-white text-black'
                : 'text-white/65 hover:bg-white/6 hover:text-white'
            }`}
          >
            Семейный
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('overall')}
            className={`rounded-md border border-white/10 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'overall'
                ? 'bg-(--color-brand-home) text-black'
                : 'text-white/65 hover:bg-white/6 hover:text-white'
            }`}
          >
            Общий
          </button>
        </div>

        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть лидерборд
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
