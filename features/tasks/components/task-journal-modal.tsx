import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'
import { formatRelativeDate } from '@/shared/lib/format'
import type { HouseholdTask } from '@/shared/types/family'

type TaskJournalModalProps = {
  tasks: HouseholdTask[]
  onClose: () => void
}

export function TaskJournalModal({ tasks, onClose }: TaskJournalModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
      <div className='modal-header'>
        <div className='flex items-center justify-between gap-4'>
          <h2 className='mt-2 heading-modal'>Выполненные задачи</h2>
        </div>
      </div>

      <div className='modal-scroll'>
        {tasks.length ? (
          <div className='stack-sm'>
            {tasks.map(task => (
              <div
                key={task.id}
                className='list-card'
              >
                <div className='space-y-2'>
                  <StatusPill tone='done'>Выполнено</StatusPill>
                  <h3 className='text-xl font-bold'>{task.title}</h3>
                  {task.note ? (
                    <p className='text-sm leading-6 text-white/70'>{task.note}</p>
                  ) : null}
                  <div className='text-xs text-white/45'>
                    Закрыл(а) {task.completedByName ?? 'неизвестно'} •{' '}
                    {task.completedAt ? formatRelativeDate(task.completedAt) : 'без даты'}
                  </div>
                  <div className='text-xs text-white/35'>
                    Создано: {formatRelativeDate(task.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='empty-state'>Пока нет выполненных задач.</div>
        )}
      </div>

      <div className='modal-footer'>
        <AppButton
          tone='light'
          onClick={onClose}
          className='w-full'
        >
          Закрыть журнал
        </AppButton>
      </div>
    </ModalPanel>
  )
}
