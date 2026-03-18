import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { TextAreaField, TextInput } from '@/components/ui/form-field'
import { StatusMessage } from '@/components/ui/status-message'

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

          <div className='flex rounded-md border border-white/10 bg-white/5 p-1'>
            <button
              type='button'
              onClick={() => onUrgencyChange('soon')}
              className={`w-full rounded-[calc(var(--radius-md)-4px)] px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                urgency === 'soon'
                  ? 'bg-(--color-brand-home)/20 text-(--color-page-text) shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
                  : 'text-white/70'
              }`}
            >
              ⚠️
            </button>

            <button
              type='button'
              onClick={() => onUrgencyChange('out')}
              className={`w-full rounded-[calc(var(--radius-md)-4px)] px-6 py-3 text-sm font-semibold transition-colors duration-150 ${
                urgency === 'out'
                  ? 'bg-(--color-danger-soft) text-rose-900 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
                  : 'text-white/70'
              }`}
            >
              ❌
            </button>

            <button
              type='button'
              onClick={() => onUrgencyChange('without')}
              className={`w-full rounded-[calc(var(--radius-md)-4px)] px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                urgency === 'without'
                  ? 'bg-(--color-success-soft) text-gray-800 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
                  : 'text-white/70'
              }`}
            >
              ♾️
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
