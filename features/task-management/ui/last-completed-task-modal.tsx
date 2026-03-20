import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'
import { StatusPill } from '@shared/ui/status-pill'
import { formatPoints, getDisplayedTaskRewardUnits } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { HouseholdTask } from '@entities/family'

type LastCompletedTaskModalProps = {
  task: HouseholdTask | null
  participantCount: number
  onClose: () => void
}

export function LastCompletedTaskModal({
  task,
  participantCount,
  onClose,
}: LastCompletedTaskModalProps) {
  return (
    <ModalPanel>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Последнее закрытие
          </h2>
        </div>
      </div>

      <div className='p-4 sm:p-6'>
        {task ? (
          <div className='rounded-md border border-white/10 bg-white/6 p-5'>
            <div className='space-y-3'>
              <StatusPill tone='done'>Выполнено</StatusPill>
              <h3 className='font-(--font-family-heading) text-2xl leading-tight'>{task.title}</h3>
              {task.note ? <p className='text-sm leading-6 text-white/70'>{task.note}</p> : null}
              <div className='text-sm text-white/80'>
                Начислено:{' '}
                {formatPoints(
                  getDisplayedTaskRewardUnits({
                    createdAt: new Date(task.createdAt),
                    completedAt: new Date(task.completedAt ?? task.createdAt),
                    completedByName: task.completedByName,
                    participantCount,
                  }),
                )}{' '}
                балла
              </div>
              <div className='text-xs text-white/45'>
                Закрыл(а) {task.completedByName ?? 'неизвестно'} •{' '}
                {task.completedAt ? formatRelativeDate(task.completedAt) : 'без даты'}
              </div>
              <div className='text-xs text-white/45'>
                Дедлайн: {formatRelativeDate(task.deadlineAt)}
              </div>
              <div className='text-xs text-white/35'>
                Создано: {formatRelativeDate(task.createdAt)}
              </div>
            </div>
          </div>
        ) : (
          <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
            Пока нет выполненных задач.
          </div>
        )}
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6'>
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
