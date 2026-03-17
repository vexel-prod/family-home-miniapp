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
    <ModalPanel wide tall>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
              ЖУРНАЛ БЫТ
            </div>
            <h2 className='mt-2 font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
              Выполненные задачи
            </h2>
          </div>
          <AppButton tone='ghost' onClick={onClose}>
            Закрыть
          </AppButton>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {tasks.length ? (
          <div className='space-y-4'>
            {tasks.map(task => (
              <div
                key={task.id}
                className='rounded-lg border border-white/10 bg-(--color-panel-muted) p-4'
              >
                <div className='space-y-2'>
                  <StatusPill tone='done'>Выполнено</StatusPill>
                  <h3 className='font-(--font-family-heading) text-2xl leading-tight'>
                    {task.title}
                  </h3>
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
          <div className='rounded-lg border border-dashed border-white/12 bg-(--color-panel-muted) px-4 py-10 text-center text-white/60'>
            Пока нет выполненных задач.
          </div>
        )}
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6'>
        <AppButton tone='light' onClick={onClose}>
          Закрыть журнал
        </AppButton>
      </div>
    </ModalPanel>
  )
}
