import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { TextAreaField, TextInput } from '@/components/ui/form-field'

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
      <div className='p-4 sm:p-6'>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новый товар' : 'Редактировать товар'}
          </h2>
        </div>

        <div className='mt-4 space-y-4'>
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
            placeholder='Стоимость в баллах'
            value={cost}
            onChange={event => onCostChange(event.target.value)}
          />

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
      </div>
    </ModalPanel>
  )
}
