import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'
import type { HouseholdTask } from '@/shared/types/family'

type TaskActionsModalProps = {
  task: HouseholdTask
  busyKey: string | null
  onClose: () => void
  onComplete: () => void
  onCompleteTogether: () => void
  onReplace: () => void
  onDelete: () => void
}

export function TaskActionsModal({
  task,
  busyKey,
  onClose,
  onComplete,
  onCompleteTogether,
  onReplace,
  onDelete,
}: TaskActionsModalProps) {
  return (
    <ModalPanel>
      <div className='modal-body'>
        <div className='space-y-2'>
          <div className='eyebrow eyebrow--inverse'>БЫТ</div>
          <h2 className='heading-modal'>{task.title}</h2>
          <StatusPill tone={task.priority}>
            {task.priority === 'urgent' ? 'Срочно' : 'Обычно'}
          </StatusPill>
          {task.note ? <div className='text-sm leading-6 text-white/65'>{task.note}</div> : null}
          <div className='text-sm text-white/60'>Выбери действие для этой задачи.</div>
        </div>

        <div className='mt-5 stack-sm'>
          <AppButton
            tone='home'
            onClick={onComplete}
            disabled={busyKey === `task-${task.id}`}
          >
            {busyKey === `task-${task.id}` ? 'Обновляю...' : 'Отметить выполненной'}
          </AppButton>

          <AppButton
            tone='together'
            onClick={onCompleteTogether}
            disabled={busyKey === `task-together-${task.id}`}
          >
            {busyKey === `task-together-${task.id}` ? 'Отмечаю...' : 'Сделано вместе'}
          </AppButton>

          <AppButton
            tone='success'
            onClick={onReplace}
          >
            Изменить
          </AppButton>

          <AppButton
            tone='danger'
            onClick={onDelete}
            disabled={busyKey === `delete-task-${task.id}`}
          >
            {busyKey === `delete-task-${task.id}` ? 'Удаляю...' : 'Удалить'}
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onClose}
          >
            Закрыть
          </AppButton>
        </div>
      </div>
    </ModalPanel>
  )
}
