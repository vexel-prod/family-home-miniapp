import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { StatusPill } from '@shared/ui/status-pill'
import { formatPoints } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { HouseholdTask } from '@entities/family'

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
  const deadlineAlertActive = Boolean(task.lastDeadlineReminderAt || task.penaltyAppliedAt)

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='space-y-2'>
          <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
            БЫТ
          </div>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {task.title}
          </h2>
          <StatusPill tone={deadlineAlertActive ? 'urgent' : 'soon'}>
            {deadlineAlertActive ? 'Срок уже горит' : 'В работе'}
          </StatusPill>
          {task.note ? <div className='text-sm leading-6 text-white/65'>{task.note}</div> : null}
          {task.assignedMemberName ? (
            <div className='text-sm text-white/65'>Адресат: {task.assignedMemberName}</div>
          ) : null}
          <div className='text-sm text-white/65'>
            Награда:{' '}
            {task.rewardUnits ? `${formatPoints(task.rewardUnits)} house-coin` : 'базовая'}
          </div>
          <div className='text-sm text-white/65'>Дедлайн: {formatRelativeDate(task.deadlineAt)}</div>
          <div className='text-sm text-white/60'>Выбери действие для этой задачи.</div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          <AppButton tone='home' onClick={onComplete} disabled={busyKey === `task-${task.id}`}>
            {busyKey === `task-${task.id}` ? 'Обновляю...' : 'Отметить выполненной'}
          </AppButton>

          <AppButton
            tone='together'
            onClick={onCompleteTogether}
            disabled={busyKey === `task-together-${task.id}`}
          >
            {busyKey === `task-together-${task.id}` ? 'Отмечаю...' : 'Сделали вместе 🤝'}
          </AppButton>

          <AppButton tone='success' onClick={onReplace}>
            Редактировать
          </AppButton>

          <AppButton
            tone='danger'
            onClick={onDelete}
            disabled={busyKey === `delete-task-${task.id}`}
          >
            {busyKey === `delete-task-${task.id}` ? 'Удаляю...' : 'Удалить'}
          </AppButton>
        </div>
      </ModalBody>

      <ModalFooter>
        <AppButton tone='secondary' onClick={onClose}>
          Закрыть
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
