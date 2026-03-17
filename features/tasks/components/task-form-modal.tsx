import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { SelectField, TextAreaField, TextInput } from '@/components/ui/form-field'
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
      <div className='modal-body'>
        <div className='space-y-2'>
          <div className='eyebrow eyebrow--inverse'>
            {mode === 'create' ? 'Добавить задачу' : 'Изменить задачу'}
          </div>
          <h2 className='heading-modal'>{mode === 'create' ? 'Новая задача' : 'Новая форма'}</h2>
        </div>

        <div className='mt-5 stack-sm'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: разобрать сушилку' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <SelectField
            value={priority}
            onChange={event =>
              onPriorityChange(event.target.value === 'urgent' ? 'urgent' : 'normal')
            }
          >
            <option value='normal'>Обычный приоритет</option>
            <option value='urgent'>Срочно</option>
          </SelectField>

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
