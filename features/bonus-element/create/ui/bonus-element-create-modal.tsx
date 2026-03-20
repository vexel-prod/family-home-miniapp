import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'

type BonusElementCreateModalProps = {
  onOpenRewardForm: () => void
  onOpenGoalForm: () => void
  onBack: () => void
}

export function BonusElementCreateModal({
  onOpenRewardForm,
  onOpenGoalForm,
  onBack,
}: BonusElementCreateModalProps) {
  return (
    <ModalPanel>
      <div className='p-4 sm:p-6'>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            Добавить элемент
          </h2>
        </div>

        <div className='mt-4 space-y-4'>
          <AppButton
            tone='secondary'
            onClick={onOpenRewardForm}
          >
            Добавить товар
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onOpenGoalForm}
          >
            Создать цель
          </AppButton>

          <AppButton
            tone='ghost'
            onClick={onBack}
          >
            Назад
          </AppButton>
        </div>
      </div>
    </ModalPanel>
  )
}
