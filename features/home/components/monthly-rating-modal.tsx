import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { MonthlyRatingBoard } from '@/features/home/components/monthly-rating-board'
import type { MonthlyRatingSummary } from '@/shared/lib/monthly-rating'

type MonthlyRatingModalProps = {
  summary: MonthlyRatingSummary
  onClose: () => void
}

export function MonthlyRatingModal({ summary, onClose }: MonthlyRatingModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
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
