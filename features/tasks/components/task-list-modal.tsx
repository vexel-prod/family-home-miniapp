import type { HouseholdTask } from '@/shared/types/family'
import { formatRelativeDate } from '@/shared/lib/format'
import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'

type TaskListModalProps = {
  tasks: HouseholdTask[]
  onClose: () => void
  onAdd: () => void
  onSelectTask: (task: HouseholdTask) => void
}

export function TaskListModal({ tasks, onClose, onAdd, onSelectTask }: TaskListModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
      <div className='modal-header'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='eyebrow eyebrow--inverse'>БЫТ</div>
            <h2 className='mt-2 heading-modal'>Все текущие задачи</h2>
          </div>
          <AppButton
            tone='ghost'
            onClick={onClose}
          >
            Закрыть
          </AppButton>
        </div>
      </div>

      <div className='modal-scroll'>
        {tasks.length ? (
          <div className='stack-sm'>
            {tasks.map(task => (
              <button
                key={task.id}
                type='button'
                className='list-card'
                onClick={() => onSelectTask(task)}
              >
                <div className='space-y-2'>
                  <StatusPill tone={task.priority}>
                    {task.priority === 'urgent' ? 'Срочно' : 'Обычно'}
                  </StatusPill>
                  <h3 className='text-xl font-bold'>{task.title}</h3>
                  {task.note ? (
                    <p className='text-sm leading-6 text-white/70'>{task.note}</p>
                  ) : null}
                  <div className='text-xs text-white/45'>
                    Добавил(а) {task.addedByName} • {formatRelativeDate(task.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className='empty-state'>Нет активных задач</div>
        )}
      </div>

      <div className='modal-footer stack-sm'>
        <AppButton
          tone='home'
          onClick={onAdd}
        >
          Добавить
        </AppButton>
        <AppButton
          tone='light'
          onClick={onClose}
        >
          Ознакомлен
        </AppButton>
      </div>
    </ModalPanel>
  )
}
