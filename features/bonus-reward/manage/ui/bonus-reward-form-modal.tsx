import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'

type BonusRewardFormModalProps = {
  mode: 'create' | 'edit'
  title: string
  description: string
  cost: string
  loading: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCostChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function BonusRewardFormModal({
  mode,
  title,
  description,
  cost,
  loading,
  onTitleChange,
  onDescriptionChange,
  onCostChange,
  onSubmit,
  onBack,
}: BonusRewardFormModalProps) {
  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новый товар' : 'Редактировать товар'}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          <TextInput
            placeholder='Название награды'
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <TextAreaField
            placeholder='Короткое описание'
            value={description}
            onChange={event => onDescriptionChange(event.target.value)}
          />

          <TextInput
            inputMode='numeric'
            placeholder='Стоимость в HC'
            value={cost}
            onChange={event => onCostChange(event.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
          <AppButton
            tone='secondary'
            onClick={onSubmit}
            disabled={loading}
          >
            {loading
              ? mode === 'create'
                ? 'Добавляю...'
                : 'Сохраняю...'
              : mode === 'create'
                ? 'Добавить товар'
                : 'Сохранить товар'}
          </AppButton>

          <AppButton
            tone='ghost'
            onClick={onBack}
          >
            Назад
          </AppButton>
        </div>
      </ModalFooter>
    </ModalPanel>
  )
}
