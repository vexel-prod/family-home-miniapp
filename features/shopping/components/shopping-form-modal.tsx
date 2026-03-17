import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { SelectField, TextAreaField, TextInput } from '@/components/ui/form-field'
import { StatusMessage } from '@/components/ui/status-message'

type ShoppingFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  quantity: string
  note: string
  urgency: 'soon' | 'out'
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  onTitleChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onNoteChange: (value: string) => void
  onUrgencyChange: (value: 'soon' | 'out') => void
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
      <div className='modal-body'>
        <div className='space-y-2'>
          <div className='eyebrow eyebrow--inverse'>
            {mode === 'create' ? 'Добавить покупку' : 'Заменить позицию'}
          </div>
          <h2 className='heading-modal'>{mode === 'create' ? 'Новая позиция' : 'Новая форма'}</h2>
        </div>

        <div className='mt-5 stack-sm'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: овсяное молоко' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <SelectField
            value={urgency}
            onChange={event => onUrgencyChange(event.target.value === 'out' ? 'out' : 'soon')}
          >
            <option value='soon'>Заканчивается</option>
            <option value='out'>Закончилось</option>
          </SelectField>

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
