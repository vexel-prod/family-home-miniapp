import { useState } from 'react'

import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { StatusPill } from '@shared/ui/status-pill'
import { formatRelativeDate } from '@entities/family'
import type { HouseholdTask, ShoppingItem } from '@entities/family'
import { CompletedTaskCard } from './completed-task-card'

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
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Журнал действий
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        {activeTab === 'tasks' ? (
          <>
            {tasks.length ? (
              <div className='space-y-4'>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className='space-y-2'
                  >
                    <CompletedTaskCard
                      task={task}
                      participantCount={participantCount}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
                Список пуст
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
                Список пуст
              </div>
            )}
          </>
        ) : null}
      </ModalBody>

      <ModalFooter className='space-y-3'>
        <div className='grid grid-cols-2 gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('tasks')}
            className={`rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold transition-colors duration-150 ${
              activeTab === 'tasks'
                ? 'border-transparent bg-(--color-brand-home) text-black shadow-(--shadow-card)'
                : 'bg-white/6 text-white/75 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            Задачи
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('shopping')}
            className={`rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold transition-colors duration-150 ${
              activeTab === 'shopping'
                ? 'border  bg-(--color-brand-shopping) text-black shadow-(--shadow-card)'
                : 'bg-white/6 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            Покупки
          </button>
        </div>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть журнал
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
