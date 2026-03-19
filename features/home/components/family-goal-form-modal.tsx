import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { TextAreaField, TextInput } from '@/components/ui/form-field'

type FamilyGoalFormModalProps = {
  mode: 'create' | 'edit'
  kind: 'spiritual' | 'material'
  title: string
  description: string
  targetValue: string
  currentValue: string
  unitLabel: string
  loading: boolean
  onKindChange: (value: 'spiritual' | 'material') => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTargetValueChange: (value: string) => void
  onCurrentValueChange: (value: string) => void
  onUnitLabelChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function FamilyGoalFormModal({
  mode,
  kind,
  title,
  description,
  targetValue,
  currentValue,
  unitLabel,
  loading,
  onKindChange,
  onTitleChange,
  onDescriptionChange,
  onTargetValueChange,
  onCurrentValueChange,
  onUnitLabelChange,
  onSubmit,
  onBack,
}: FamilyGoalFormModalProps) {
  return (
    <ModalPanel>
      <div className='p-4 sm:p-6'>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая цель' : 'Редактировать цель'}
          </h2>
        </div>

        <div className='mt-4 space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={() => onKindChange('spiritual')}
              className={`rounded-xl border px-4 py-4 text-base font-semibold transition-colors duration-150 ${
                kind === 'spiritual'
                  ? 'border-transparent bg-white text-(--color-page-text) shadow-(--shadow-card)'
                  : 'border-white/10 bg-(--color-panel-field) text-white/75 hover:border-white/20'
              }`}
            >
              Для души
            </button>
            <button
              type='button'
              onClick={() => onKindChange('material')}
              className={`rounded-xl border px-4 py-4 text-base font-semibold transition-colors duration-150 ${
                kind === 'material'
                  ? 'border-transparent bg-white text-(--color-page-text) shadow-(--shadow-card)'
                  : 'border-white/10 bg-(--color-panel-field) text-white/75 hover:border-white/20'
              }`}
            >
              Покупка
            </button>
          </div>

          <TextInput
            placeholder='Название цели'
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <TextAreaField
            placeholder='Коротко опиши, к чему идет семья'
            value={description}
            onChange={event => onDescriptionChange(event.target.value)}
          />

          <TextInput
            inputMode='numeric'
            placeholder={kind === 'spiritual' ? 'Сколько общих баллов нужно' : 'Целевое значение'}
            value={targetValue}
            onChange={event => onTargetValueChange(event.target.value)}
          />

          {kind === 'material' ? (
            <>
              <TextInput
                inputMode='numeric'
                placeholder='Текущий прогресс'
                value={currentValue}
                onChange={event => onCurrentValueChange(event.target.value)}
              />
              <TextInput
                placeholder='Единица, например ₽'
                value={unitLabel}
                onChange={event => onUnitLabelChange(event.target.value)}
              />
            </>
          ) : null}

          <AppButton
            tone='secondary'
            onClick={onSubmit}
            disabled={loading}
          >
            {loading
              ? mode === 'create'
                ? 'Создаю...'
                : 'Сохраняю...'
              : mode === 'create'
                ? 'Создать цель'
                : 'Сохранить цель'}
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
