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
      <div className='flex h-[min(82dvh,44rem)] w-[min(100%,26rem)] flex-col overflow-hidden sm:w-[min(100%,54rem)]'>
        <div className='flex-none border-b border-white/10 p-4 sm:p-6'>
          <div className='text-center uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
            Лидербоард месяца
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4'>
          <MonthlyRatingBoard summary={summary} />
        </div>

        <div className='flex-none border-t border-white/10 p-4 sm:p-6'>
          <AppButton
            tone='ghost'
            onClick={onClose}
          >
            Закрыть лидербоард
          </AppButton>
        </div>
      </div>
    </ModalPanel>
  )
}
