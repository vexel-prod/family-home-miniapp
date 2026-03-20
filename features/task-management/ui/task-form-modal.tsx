import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'
import { StatusMessage } from '@shared/ui/status-message'

type TaskFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  note: string
  deadlineDay: string
  deadlineTime: string
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  onTitleChange: (value: string) => void
  onNoteChange: (value: string) => void
  onDeadlineDayChange: (value: string) => void
  onDeadlineTimeChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function TaskFormModal({
  mode,
  title,
  note,
  deadlineDay,
  deadlineTime,
  status,
  loading,
  submitLabel,
  busyLabel,
  onTitleChange,
  onNoteChange,
  onDeadlineDayChange,
  onDeadlineTimeChange,
  onSubmit,
  onBack,
}: TaskFormModalProps) {
  return (
    <ModalPanel>
      <ModalHeader>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая задача' : 'Вносим изменения'}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: разобрать сушилку' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='space-y-2'>
            <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Сделать до</div>
            <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]'>
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { value: 'today', label: 'Сегодня' },
                  { value: 'tomorrow', label: 'Завтра' },
                ].map(option => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => onDeadlineDayChange(option.value)}
                    className={`text-center rounded-xl border px-4 py-4 text-base transition-colors duration-150 ${
                      deadlineDay === option.value
                        ? 'border-transparent bg-(--color-brand-home)/70 text-[#111827] shadow-(--shadow-card)'
                        : 'border-white/10 bg-(--color-panel-field) text-(--color-panel-text) hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <TextInput
                type='text'
                inputMode='numeric'
                placeholder='14:00'
                maxLength={5}
                value={deadlineTime}
                onChange={event => onDeadlineTimeChange(event.target.value)}
              />
            </div>
          </div>

          <TextAreaField
            placeholder={mode === 'create' ? 'Комментарий или детали' : 'Комментарий'}
            value={note}
            onChange={event => onNoteChange(event.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
          <AppButton
            tone={mode === 'create' ? 'home' : 'success'}
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
