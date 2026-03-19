import { useState } from 'react'

import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'
import { formatPoints, getDisplayedTaskRewardUnits } from '@/shared/lib/bonus-shop'
import { formatRelativeDate } from '@/shared/lib/format'
import type { HouseholdTask, ShoppingItem } from '@/shared/types/family'

type JournalTab = 'tasks' | 'shopping'

type TaskJournalModalProps = {
  tasks: HouseholdTask[]
  purchasedItems: ShoppingItem[]
  participantCount: number
  onClose: () => void
}

export function TaskJournalModal({
  tasks,
  purchasedItems,
  participantCount,
  onClose,
}: TaskJournalModalProps) {
  const [activeTab, setActiveTab] = useState<JournalTab>('tasks')

  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-center gap-4'>
            <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
              Журнал
            </h2>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('tasks')}
              className={`rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors duration-150 ${
                activeTab === 'tasks'
                  ? 'border-transparent bg-(--color-brand-home) text-(--color-page-text) shadow-(--shadow-card)'
                  : 'border-white/10 bg-white/6 text-white/75 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              Задачи
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('shopping')}
              className={`rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors duration-150 ${
                activeTab === 'shopping'
                  ? 'border-transparent bg-(--color-brand-shopping) text-(--color-page-text) shadow-(--shadow-card)'
                  : 'border-white/10 bg-white/6 text-white/75 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              Покупки
            </button>
          </div>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {activeTab === 'tasks' ? (
          <>
            {tasks.length ? (
              <div className='space-y-4'>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className='rounded-md border border-white/10 bg-white/6 p-5'
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
                ))}
              </div>
            ) : (
              <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
                Пока нет выполненных задач.
              </div>
            )}
          </>
        ) : null}

        {activeTab === 'shopping' ? (
          <>
            {purchasedItems.length ? (
              <div className='space-y-4'>
                {purchasedItems.map(item => (
                  <div
                    key={item.id}
                    className='rounded-md border border-white/10 bg-white/6 p-5'
                  >
                    <div className='space-y-2'>
                      <StatusPill tone='done'>Куплено</StatusPill>
                      <h3 className='font-(--font-family-heading) text-2xl leading-tight'>
                        {item.title}
                      </h3>
                      {item.quantityLabel ? (
                        <div className='text-sm text-white/80'>
                          Количество: {item.quantityLabel}
                        </div>
                      ) : null}
                      {item.note ? (
                        <p className='text-sm leading-6 text-white/70'>{item.note}</p>
                      ) : null}
                      <div className='text-xs text-white/45'>
                        Купил(а) {item.purchasedByName ?? 'неизвестно'} •{' '}
                        {item.purchasedAt ? formatRelativeDate(item.purchasedAt) : 'без даты'}
                      </div>
                      <div className='text-xs text-white/35'>
                        Добавлено: {item.addedByName} • {formatRelativeDate(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
                Пока нет отмеченных покупок.
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть журнал
        </AppButton>
      </div>
    </ModalPanel>
  )
}
