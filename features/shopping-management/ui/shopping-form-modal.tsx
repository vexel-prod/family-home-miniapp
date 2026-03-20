import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'
import { StatusMessage } from '@shared/ui/status-message'

type ShoppingFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  quantity: string
  note: string
  urgency: 'soon' | 'out' | 'without'
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  onTitleChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onNoteChange: (value: string) => void
  onUrgencyChange: (value: 'soon' | 'out' | 'without') => void
  onSubmit: () => void
  onBack: () => void
}

export function ShoppingFormModal({
  mode,
  title,
  quantity,
  note,
  urgency,
  status,
  loading,
  submitLabel,
  busyLabel,
  onTitleChange,
  onQuantityChange,
  onNoteChange,
  onUrgencyChange,
  onSubmit,
  onBack,
}: ShoppingFormModalProps) {
  return (
    <ModalPanel>
      <div className='p-4 sm:p-6'>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая позиция' : 'Внести изменения'}
          </h2>
        </div>

        <div className='mt-4 space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: овсяное молоко' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-white/6 p-1'>
            <button
              type='button'
              onClick={() => onUrgencyChange('without')}
              className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2 py-1 text-center text-xs font-semibold transition-colors duration-150 ${
                urgency === 'without'
                  ? 'bg-(--color-brand-shopping)/60 text-(--color-panel) shadow-(--shadow-card)'
                  : 'text-white/70'
              }`}
            >
              не срочно
            </button>
            <button
              type='button'
              onClick={() => onUrgencyChange('soon')}
              className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2 py-1 text-center text-xs font-semibold transition-colors duration-150 ${
                urgency === 'soon'
                  ? 'bg-(--color-brand-home)/60 text-[#111827] shadow-(--shadow-card)'
                  : 'text-white/70'
              }`}
            >
              заканчивается
            </button>

            <button
              type='button'
              onClick={() => onUrgencyChange('out')}
              className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2 py-1 text-center text-xs font-semibold transition-colors duration-150 ${
                urgency === 'out'
                  ? 'bg-(--color-danger)/60 text-(--color-danger-text) shadow-(--shadow-card)'
                  : 'text-white/70'
              }`}
            >
              закончилось
            </button>
          </div>

          <TextInput
            placeholder='Количество или упаковка'
            value={quantity}
            onChange={event => onQuantityChange(event.target.value)}
          />

          <TextAreaField
            placeholder={
              mode === 'create' ? 'Комментарий: бренд, магазин, пожелание' : 'Комментарий'
            }
            value={note}
            onChange={event => onNoteChange(event.target.value)}
          />

          <AppButton
            tone='shopping'
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? busyLabel : submitLabel}
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onBack}
          >
            Назад
          </AppButton>
        </div>
      </div>
    </ModalPanel>
  )
}
