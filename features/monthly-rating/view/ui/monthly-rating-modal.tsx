import type { MonthlyRatingSummary } from '@entities/monthly-rating'
import { MonthlyRatingBoard } from '@entities/monthly-rating'
import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'

type MonthlyRatingModalProps = {
  summary: MonthlyRatingSummary
  onClose: () => void
}

export function MonthlyRatingModal({ summary, onClose }: MonthlyRatingModalProps) {
  return (
    <ModalPanel>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
            Лидерство за {summary.monthLabel}
          </h2>
        </div>
      </div>

      <MonthlyRatingBoard summary={summary} />

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
