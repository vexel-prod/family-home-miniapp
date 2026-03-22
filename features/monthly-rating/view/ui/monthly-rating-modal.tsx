import type { MonthlyRatingSummary } from '@entities/monthly-rating'
import { MonthlyRatingBoard } from '@entities/monthly-rating'
import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'

type MonthlyRatingModalProps = {
  summary: MonthlyRatingSummary
  loading?: boolean
  onClose: () => void
}

export function MonthlyRatingModal({ summary, loading = false, onClose }: MonthlyRatingModalProps) {
  return (
    <ModalPanel>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
            {loading ? (
              <span aria-hidden='true' className='skeleton inline-flex h-6 w-44 rounded-full align-middle bg-white/15' />
            ) : (
              `Лидерство за ${summary.monthLabel}`
            )}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className='flex-1 space-y-4 p-4 sm:p-6'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='rounded-md border border-white/10 bg-white/6 p-4'>
              <div className='flex items-center justify-between gap-4'>
                <div className='skeleton h-6 w-32 rounded-full bg-white/15' />
                <div className='skeleton h-6 w-16 rounded-full bg-white/15' />
              </div>
              <div className='mt-3 skeleton h-3 w-full rounded-full bg-white/15' />
            </div>
          ))}
        </div>
      ) : (
        <MonthlyRatingBoard summary={summary} />
      )}

      <div className='flex-none border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть лидерборд
        </AppButton>
      </div>
    </ModalPanel>
  )
}
