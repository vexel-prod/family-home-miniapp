import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'
import { formatRelativeDate } from '@/shared/lib/format'
import type { HouseholdTask } from '@/shared/types/family'

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
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          {tasks.length > 0 && (
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              Всего: {tasks.length}
            </h2>
          )}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {tasks.length ? (
          <div className='space-y-4 max-h-[45dvh]'>
            {tasks.map(task => (
              <button
                key={task.id}
                type='button'
                className='w-full rounded-lg border border-white/10 bg-(--color-panel-muted) p-4 text-left transition-colors duration-150 hover:bg-white/10'
                onClick={() => onSelectTask(task)}
              >
                <div className='space-y-2'>
                  <StatusPill tone={task.priority}>
                    {task.priority === 'urgent' ? 'Срочно' : 'Обычно'}
                  </StatusPill>
                  <h3 className='font-(--font-family-heading) text-2xl leading-tight'>
                    {task.title}
                  </h3>
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
          <div className='rounded-lg border border-dashed border-white/12 bg-(--color-panel-muted) px-4 py-10 text-center text-white/60'>
            Нет активных задач
          </div>
        )}
      </div>

      <div className='space-y-4 border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='home'
          onClick={onAdd}
        >
          Добавить
        </AppButton>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть
        </AppButton>
      </div>
    </ModalPanel>
  )
}
