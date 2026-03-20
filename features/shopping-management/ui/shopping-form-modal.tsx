import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
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
  const urgencyOptions: Array<{
    value: 'soon' | 'out' | 'without'
    label: string
    activeClassName: string
    text: string
  }> = [
    {
      value: 'soon',
      label: 'скоро закончится',
      activeClassName:
        'border-transparent bg-(--color-brand-home)/60 text-[#111827] shadow-(--shadow-card)',
        text: 'мало'
    },
    {
      value: 'out',
      label: 'закончилось',
      activeClassName:
        'border-transparent bg-(--color-danger)/60 text-(--color-danger-text) shadow-(--shadow-card)',
        text: 'кончилось'
    },
    {
      value: 'without',
      label: 'не срочно',
      activeClassName: 'border-transparent bg-white/60 text-(--color-panel) shadow-(--shadow-card)',
      text: 'без срока'
    },
    
  ]

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая позиция' : 'Внести изменения'}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: овсяное молоко' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='space-y-3'>
            <div className='grid grid-cols-3 gap-2 rounded-[1.2rem] border border-white/10 bg-white/6 p-1.5'>
              {urgencyOptions.map(option => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => onUrgencyChange(option.value)}
                  aria-label={option.label}
                  title={option.label}
                  className={`min-w-0 rounded-[0.95rem] border px-2 py-3 text-center transition-all duration-150 ${
                    urgency === option.value
                      ? option.activeClassName
                      : 'border-white/10 bg-transparent text-white/68 hover:bg-white/8 hover:text-white/88'
                  }`}
                >{option.text}</button>
              ))}
            </div>
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
        </div>
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
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
      </ModalFooter>
    </ModalPanel>
  )
}
