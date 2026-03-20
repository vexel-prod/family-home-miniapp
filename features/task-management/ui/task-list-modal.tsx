import { AppButton } from '@shared/ui/app-button'
import { ModalPanel } from '@shared/ui/app-modal'
import { StatusPill } from '@shared/ui/status-pill'
import { formatPoints } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import type { HouseholdTask } from '@entities/family'

type TaskListModalProps = {
  tasks: HouseholdTask[]
  onClose: () => void
  onAdd: () => void
  onSelectTask: (task: HouseholdTask) => void
}

export function TaskListModal({ tasks, onClose, onAdd, onSelectTask }: TaskListModalProps) {
  return (
    <ModalPanel>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Активные задачи{tasks.length > 0 && `: ${tasks.length}`}
          </h2>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {tasks.length ? (
          <div className='space-y-4'>
            {tasks.map(task =>
              (() => {
                const deadlineAlertActive = Boolean(
                  task.lastDeadlineReminderAt || task.penaltyAppliedAt,
                )
                const isPendingApproval = task.status === 'pending-approval'

                return (
                  <button
                    key={task.id}
                    type='button'
                    className='w-full rounded-xl border border-white/10 bg-white/6 p-5 text-left transition-colors duration-150 hover:bg-white/10'
                    onClick={() => onSelectTask(task)}
                  >
                    <div className='space-y-2'>
                      <StatusPill
                        tone={
                          isPendingApproval ? 'normal' : deadlineAlertActive ? 'urgent' : 'soon'
                        }
                      >
                        {isPendingApproval
                          ? 'Ожидает подтверждения'
                          : deadlineAlertActive
                            ? 'Дедлайн горит'
                            : 'Есть дедлайн'}
                      </StatusPill>
                      <h3 className='font-(--font-family-heading) text-2xl leading-tight'>
                        {task.title}
                      </h3>
                      {task.note ? (
                        <p className='text-sm leading-6 text-white/70'>{task.note}</p>
                      ) : null}
                      <div className='flex flex-wrap gap-2 text-xs text-white/55'>
                        {task.assignedMemberName ? (
                          <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1'>
                            Для: {task.assignedMemberName}
                          </span>
                        ) : null}
                        <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1'>
                          {task.rewardUnits
                            ? `${formatPoints(task.rewardUnits)} HC`
                            : 'Базовая награда'}
                        </span>
                      </div>
                      <div className='text-sm text-white/70'>
                        Сделать до: {formatRelativeDate(task.deadlineAt)}
                      </div>
                      <div className='text-xs text-white/45'>
                        Добавил(а) {task.addedByName} • {formatRelativeDate(task.createdAt)}
                      </div>
                    </div>
                  </button>
                )
              })(),
            )}
          </div>
        ) : (
          <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
            Список пуст
          </div>
        )}
      </div>

      <div className='space-y-3 border-t border-white/10 p-4 sm:p-6'>
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
