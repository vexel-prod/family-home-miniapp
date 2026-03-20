import { formatPoints, getDisplayedTaskRewardUnits } from '@entities/bonus'
import { formatRelativeDate } from '@entities/family'
import { getTaskExpResult } from '@entities/profile/lib/household-profile'
import type { HouseholdTask } from '@entities/family'
import { StatusPill } from '@shared/ui/status-pill'

type CompletedTaskCardProps = {
  task: HouseholdTask
  participantCount: number
}

export function CompletedTaskCard({ task, participantCount }: CompletedTaskCardProps) {
  const { expDelta } = getTaskExpResult({
    id: task.id,
    title: task.title,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
    deadlineAt: task.deadlineAt,
  })

  return (
    <div className='rounded-md border border-white/10 bg-white/6 p-5'>
      <div className='space-y-2'>
        <StatusPill tone='done'>Выполнено</StatusPill>
        <h3 className='font-(--font-family-heading) text-2xl leading-tight'>{task.title}</h3>
        {task.note ? <p className='text-sm leading-6 text-white/70'>{task.note}</p> : null}
        <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/45'>
          <div>
            Начислено:{' '}
            {formatPoints(
              getDisplayedTaskRewardUnits({
                createdAt: new Date(task.createdAt),
                completedAt: new Date(task.completedAt ?? task.createdAt),
                completedByName: task.completedByName,
                rewardUnits: task.rewardUnits,
                participantCount,
              }),
            )}{' '}
            HC
          </div>
          <div className={expDelta >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
            EXP: {expDelta >= 0 ? `+${expDelta}` : expDelta}
          </div>
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
  )
}
