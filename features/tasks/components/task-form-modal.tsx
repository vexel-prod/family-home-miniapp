import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { TextAreaField, TextInput } from '@/components/ui/form-field'
import { StatusMessage } from '@/components/ui/status-message'

type TaskFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  note: string
  priority: 'normal' | 'urgent'
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  onTitleChange: (value: string) => void
  onNoteChange: (value: string) => void
  onPriorityChange: (value: 'normal' | 'urgent') => void
  onSubmit: () => void
  onBack: () => void
}

export function TaskFormModal({
  mode,
  title,
  note,
  priority,
  status,
  loading,
  submitLabel,
  busyLabel,
  onTitleChange,
  onNoteChange,
  onPriorityChange,
  onSubmit,
  onBack,
}: TaskFormModalProps) {
  return (
    <ModalPanel>
      <div className='p-4 sm:p-6'>
        <div className='space-y-2'>
          {/* <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
            {mode === 'create' ? 'Добавить задачу' : 'Изменить задачу'}
          </div> */}
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая задача' : 'Вносим изменения'}
          </h2>
        </div>

        <div className='mt-4 space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: разобрать сушилку' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='grid grid-cols-2 rounded-md border border-white/10 bg-white/5 p-1'>
            <button
              type='button'
              onClick={() => onPriorityChange('normal')}
              className={`rounded-[calc(var(--radius-md)-4px)] px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                priority === 'normal'
                  ? 'bg-(--color-success-soft) text-(--color-page-text) shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
                  : 'text-white/70'
              } `}
            >
              когда удобно
            </button>

            <button
              type='button'
              onClick={() => onPriorityChange('urgent')}
              className={`rounded-[calc(var(--radius-md)-4px)] px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                priority === 'urgent'
                  ? 'bg-rose-100 text-rose-900 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4)]'
                  : 'text-white/70'
              } `}
            >
              срочно
            </button>
          </div>

          <TextAreaField
            placeholder={mode === 'create' ? 'Комментарий или детали' : 'Комментарий'}
            value={note}
            onChange={event => onNoteChange(event.target.value)}
          />

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
      </div>
    </ModalPanel>
  )
}
