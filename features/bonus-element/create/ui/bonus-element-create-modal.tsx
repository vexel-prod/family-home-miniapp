import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

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
      <ModalHeader>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            Добавить элемент
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
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
        </div>
      </ModalBody>

      <ModalFooter>
        <AppButton
          tone='ghost'
          onClick={onBack}
        >
          Назад
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
