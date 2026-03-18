'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { ModalOverlay } from '@/components/ui/app-modal'
import { NoticeToast } from '@/components/ui/notice-toast'
import { JournalSummary } from '@/features/home/components/journal-summary'
import { DashboardHero } from '@/features/home/components/dashboard-hero'
import { ShoppingActionsModal } from '@/features/shopping/components/shopping-actions-modal'
import { ShoppingFormModal } from '@/features/shopping/components/shopping-form-modal'
import { ShoppingListModal } from '@/features/shopping/components/shopping-list-modal'
import { TaskActionsModal } from '@/features/tasks/components/task-actions-modal'
import { TaskFormModal } from '@/features/tasks/components/task-form-modal'
import { TaskJournalModal } from '@/features/tasks/components/task-journal-modal'
import { TaskListModal } from '@/features/tasks/components/task-list-modal'
import { reveal } from '@/shared/lib/animations'
import {
  formatRelativeDate,
  sortCompletedTasks,
  sortShoppingItems,
  sortTasks,
} from '@/shared/lib/format'
import { getActorName, getTelegramInitData, getTelegramUser } from '@/shared/lib/telegram'
import type {
  BootstrapResponse,
  FetchOptions,
  HouseholdTask,
  ModalKey,
  ShoppingItem,
  TelegramUser,
  TelegramWindow,
} from '@/shared/types/family'

type TaskMutationResponse = {
  ok: boolean
  task: HouseholdTask
}

type ShoppingMutationResponse = {
  ok: boolean
  shoppingItem: ShoppingItem
}

export default function Page() {
  const bootstrapRequestInFlight = useRef(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [buyer, setBuyer] = useState<TelegramUser | undefined>()
  const [telegramInitData, setTelegramInitData] = useState('')
  const [modal, setModal] = useState<ModalKey>(null)
  const [modalGuardUntil, setModalGuardUntil] = useState(0)
  const [openTasks, setOpenTasks] = useState<HouseholdTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<HouseholdTask[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [selectedTask, setSelectedTask] = useState<HouseholdTask | null>(null)
  const [selectedShoppingItem, setSelectedShoppingItem] = useState<ShoppingItem | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskPriority, setTaskPriority] = useState<'normal' | 'urgent'>('normal')
  const [productTitle, setProductTitle] = useState('')
  const [productQuantity, setProductQuantity] = useState('')
  const [productNote, setProductNote] = useState('')
  const [productUrgency, setProductUrgency] = useState<'soon' | 'out'>('soon')
  const [replaceTaskTitle, setReplaceTaskTitle] = useState('')
  const [replaceTaskNote, setReplaceTaskNote] = useState('')
  const [replaceTaskPriority, setReplaceTaskPriority] = useState<'normal' | 'urgent'>('normal')
  const [replaceTitle, setReplaceTitle] = useState('')
  const [replaceQuantity, setReplaceQuantity] = useState('')
  const [replaceNote, setReplaceNote] = useState('')
  const [replaceUrgency, setReplaceUrgency] = useState<'soon' | 'out'>('soon')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [taskCreateStatus, setTaskCreateStatus] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [shoppingCreateStatus, setShoppingCreateStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const sortedTasks = sortTasks(openTasks)
  const sortedCompletedTasks = sortCompletedTasks(completedTasks)
  const sortedShoppingItems = sortShoppingItems(shoppingItems)

  const upsertOpenTask = useCallback((task: HouseholdTask) => {
    setOpenTasks(current => {
      const next = current.filter(currentTask => currentTask.id !== task.id)
      next.push(task)
      return sortTasks(next)
    })
  }, [])

  const upsertCompletedTask = useCallback((task: HouseholdTask) => {
    setCompletedTasks(current => {
      const next = current.filter(currentTask => currentTask.id !== task.id)
      next.push(task)
      return sortCompletedTasks(next).slice(0, 30)
    })
  }, [])

  const removeTaskFromLists = useCallback((taskId: string) => {
    setOpenTasks(current => current.filter(task => task.id !== taskId))
    setCompletedTasks(current => current.filter(task => task.id !== taskId))
  }, [])

  const applyTaskUpdate = useCallback(
    (task: HouseholdTask) => {
      if (task.completedAt) {
        setOpenTasks(current => current.filter(currentTask => currentTask.id !== task.id))
        upsertCompletedTask(task)
        return
      }

      setCompletedTasks(current => current.filter(currentTask => currentTask.id !== task.id))
      upsertOpenTask(task)
    },
    [upsertCompletedTask, upsertOpenTask],
  )

  const upsertShoppingItem = useCallback((item: ShoppingItem) => {
    setShoppingItems(current => {
      const next = current.filter(currentItem => currentItem.id !== item.id)
      next.push(item)
      return sortShoppingItems(next)
    })
  }, [])

  const removeShoppingItemFromList = useCallback((itemId: string) => {
    setShoppingItems(current => current.filter(item => item.id !== itemId))
  }, [])

  function canOpenModal() {
    return Date.now() >= modalGuardUntil
  }

  function closeModalWithGuard() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
  }

  function openMainModal(
    nextModal: Extract<ModalKey, 'household' | 'shopping-list' | 'task-journal'>,
  ) {
    if (!canOpenModal()) {
      return
    }

    setModal(nextModal)
  }

  const telegramFetch = useCallback(
    async (input: string, init?: FetchOptions, initDataOverride?: string) => {
      const headers = new Headers(init?.headers)
      const resolvedInitData = initDataOverride || telegramInitData || getTelegramInitData()

      if (resolvedInitData) {
        headers.set('x-telegram-init-data', resolvedInitData)
      }

      return fetch(input, {
        ...init,
        headers,
      })
    },
    [telegramInitData],
  )

  function openTaskActions(task: HouseholdTask) {
    if (!canOpenModal()) {
      return
    }

    setSelectedTask(task)
    setModal('task-actions')
  }

  function openTaskCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setTaskCreateStatus('')
    setModal('task-create')
  }

  function openTaskReplaceModal() {
    if (!selectedTask) {
      return
    }

    setReplaceTaskTitle(selectedTask.title)
    setReplaceTaskNote(selectedTask.note ?? '')
    setReplaceTaskPriority(selectedTask.priority)
    setModal('task-replace')
  }

  function closeTaskModals() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
    setSelectedTask(null)
    setReplaceTaskTitle('')
    setReplaceTaskNote('')
    setReplaceTaskPriority('normal')
    setTaskCreateStatus('')
  }

  const loadData = useCallback(
    async ({
      initDataOverride,
      silent = false,
    }: {
      initDataOverride?: string
      silent?: boolean
    } = {}) => {
      if (bootstrapRequestInFlight.current) {
        return
      }

      bootstrapRequestInFlight.current = true

      if (!silent) {
        setLoading(true)
      }

      setError('')

      try {
        const response = await telegramFetch(
          '/api/bootstrap',
          { cache: 'no-store' },
          initDataOverride,
        )

        if (!response.ok) {
          throw new Error('bootstrap failed')
        }

        const payload = (await response.json()) as BootstrapResponse
        setOpenTasks(payload.openTasks)
        setCompletedTasks(payload.completedTasks)
        setShoppingItems(payload.activeShoppingItems)
      } catch {
        setError(
          'Не получилось загрузить текущие списки. Открой приложение через Telegram и проверь доступ участника.',
        )
      } finally {
        bootstrapRequestInFlight.current = false

        if (!silent) {
          setLoading(false)
        }
      }
    },
    [telegramFetch],
  )

  useEffect(() => {
    const telegram = (window as TelegramWindow).Telegram?.WebApp
    telegram?.ready?.()
    telegram?.expand?.()
    setBuyer(getTelegramUser())
    const nextInitData = getTelegramInitData()
    setTelegramInitData(nextInitData)

    if (nextInitData) {
      void loadData({ initDataOverride: nextInitData })
    } else {
      setLoading(false)
      setError(
        'Не получилось загрузить текущие списки. Открой приложение через Telegram и проверь доступ участника.',
      )
    }
  }, [loadData])

  useEffect(() => {
    if (!telegramInitData) {
      return
    }

    let disposed = false
    let reconnectTimeoutId: number | null = null

    const refreshData = () => {
      startTransition(() => {
        void loadData({ silent: true })
      })
    }

    const connectToEventStream = () => {
      const eventSource = new EventSource(
        `/api/events?initData=${encodeURIComponent(telegramInitData)}`,
      )

      eventSourceRef.current = eventSource

      eventSource.onopen = () => {}

      eventSource.addEventListener('household-updated', () => {
        refreshData()
      })

      eventSource.onerror = () => {
        eventSource.close()

        if (!disposed) {
          reconnectTimeoutId = window.setTimeout(() => {
            connectToEventStream()
          }, 2000)
        }
      }
    }

    const refreshOnFocus = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      refreshData()
    }

    connectToEventStream()
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      disposed = true
      eventSourceRef.current?.close()
      eventSourceRef.current = null

      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId)
      }

      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [telegramInitData, loadData])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!error) {
      return
    }

    const timeout = window.setTimeout(() => setError(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [error])

  function openShoppingActions(item: ShoppingItem) {
    if (!canOpenModal()) {
      return
    }

    setSelectedShoppingItem(item)
    setModal('shopping-actions')
  }

  function openReplaceModal() {
    if (!selectedShoppingItem) {
      return
    }

    setReplaceTitle(selectedShoppingItem.title)
    setReplaceQuantity(selectedShoppingItem.quantityLabel ?? '')
    setReplaceNote(selectedShoppingItem.note ?? '')
    setReplaceUrgency(selectedShoppingItem.urgency)
    setModal('shopping-replace')
  }

  function openShoppingCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setShoppingCreateStatus('')
    setModal('shopping-create')
  }

  function closeShoppingModals() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
    setSelectedShoppingItem(null)
    setReplaceTitle('')
    setReplaceQuantity('')
    setReplaceNote('')
    setReplaceUrgency('soon')
    setShoppingCreateStatus('')
  }

  async function addTask() {
    const title = taskTitle.trim()

    if (!title) {
      setError('Впиши, какое действие нужно сделать по дому.')
      setTaskCreateStatus('Ошибка: впиши задачу.')
      return
    }

    setBusyKey('create-task')
    setError('')
    setTaskCreateStatus(`Добавляю: ${title}`)

    try {
      const response = await telegramFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          note: taskNote,
          priority: taskPriority,
        }),
      })

      if (!response.ok) {
        throw new Error('task create failed')
      }

      const payload = (await response.json()) as TaskMutationResponse

      setTaskTitle('')
      setTaskNote('')
      setTaskPriority('normal')
      setTaskCreateStatus(`Добавлено: ${title}`)
      setModal('household')
      setToast(`Задача добавлена: ${title}`)
      upsertOpenTask(payload.task)
    } catch {
      setError(`Ошибка добавления задачи: ${title}`)
      setTaskCreateStatus(`Ошибка: не удалось добавить "${title}"`)
    } finally {
      setBusyKey(null)
    }
  }

  async function addShoppingItem() {
    const title = productTitle.trim()

    if (!title) {
      setError('Впиши название продукта или товара.')
      setShoppingCreateStatus('Ошибка: впиши название продукта или товара.')
      return
    }

    setBusyKey('create-product')
    setError('')
    setShoppingCreateStatus(`Добавляю: ${title}`)

    try {
      const response = await telegramFetch('/api/shopping-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          urgency: productUrgency,
          quantityLabel: productQuantity,
          note: productNote,
        }),
      })

      if (!response.ok) {
        throw new Error('shopping create failed')
      }

      const payload = (await response.json()) as ShoppingMutationResponse

      setProductTitle('')
      setProductQuantity('')
      setProductNote('')
      setProductUrgency('soon')
      setShoppingCreateStatus(`Добавлено: ${title}`)
      setModal('shopping-list')
      setToast(`Покупка добавлена: ${title}`)
      upsertShoppingItem(payload.shoppingItem)
    } catch {
      setError(`Ошибка добавления покупки: ${title}`)
      setShoppingCreateStatus(`Ошибка: не удалось добавить "${title}"`)
    } finally {
      setBusyKey(null)
    }
  }

  async function completeTask(task: HouseholdTask, together = false) {
    setBusyKey(`${together ? 'task-together' : 'task'}-${task.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: together ? 'complete-together' : 'complete',
        }),
      })

      if (!response.ok) {
        throw new Error('task update failed')
      }

      const payload = (await response.json()) as TaskMutationResponse

      closeTaskModals()
      setToast(together ? `Сделано вместе: ${task.title}` : `Задача закрыта: ${task.title}`)
      applyTaskUpdate(payload.task)
    } catch {
      setError(
        together
          ? `Ошибка: не удалось отметить как сделано вместе "${task.title}"`
          : `Ошибка закрытия задачи: ${task.title}`,
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteTask(task: HouseholdTask) {
    setBusyKey(`delete-task-${task.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('task delete failed')
      }

      closeTaskModals()
      setToast(`Задача удалена: ${task.title}`)
      removeTaskFromLists(task.id)
    } catch {
      setError(`Ошибка удаления задачи: ${task.title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function replaceTask() {
    if (!selectedTask) {
      return
    }

    const title = replaceTaskTitle.trim()

    if (!title) {
      setError('Впиши новое название задачи.')
      return
    }

    setBusyKey(`replace-task-${selectedTask.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          title,
          note: replaceTaskNote,
          priority: replaceTaskPriority,
        }),
      })

      if (!response.ok) {
        throw new Error('task replace failed')
      }

      const payload = (await response.json()) as TaskMutationResponse

      closeTaskModals()
      setToast(`Задача обновлена: ${title}`)
      applyTaskUpdate(payload.task)
    } catch {
      setError(`Ошибка обновления задачи: ${title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function purchaseItem(item: ShoppingItem) {
    setBusyKey(`product-${item.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/shopping-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
        }),
      })

      if (!response.ok) {
        throw new Error('shopping update failed')
      }

      const payload = (await response.json()) as ShoppingMutationResponse

      closeShoppingModals()
      setToast(`Покупка отмечена: ${item.title}`)
      removeShoppingItemFromList(payload.shoppingItem.id)
    } catch {
      setError(`Ошибка обновления покупки: ${item.title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteShoppingItem(item: ShoppingItem) {
    setBusyKey(`delete-${item.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/shopping-items/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('shopping delete failed')
      }

      closeShoppingModals()
      setToast(`Покупка удалена: ${item.title}`)
      removeShoppingItemFromList(item.id)
    } catch {
      setError(`Ошибка удаления покупки: ${item.title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function replaceShoppingItem() {
    if (!selectedShoppingItem) {
      return
    }

    const title = replaceTitle.trim()

    if (!title) {
      setError('Впиши новое название позиции.')
      return
    }

    setBusyKey(`replace-${selectedShoppingItem.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/shopping-items/${selectedShoppingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          title,
          urgency: replaceUrgency,
          quantityLabel: replaceQuantity,
          note: replaceNote,
        }),
      })

      if (!response.ok) {
        throw new Error('shopping replace failed')
      }

      const payload = (await response.json()) as ShoppingMutationResponse

      closeShoppingModals()
      setToast(`Покупка обновлена: ${title}`)
      upsertShoppingItem(payload.shoppingItem)
    } catch {
      setError(`Ошибка обновления покупки: ${title}`)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className='min-h-screen bg-(--color-page-bg) text-(--color-page-text)'>
      <div className='pointer-events-none fixed inset-0 z-70 flex items-center justify-center px-4'>
        {toast ? (
          <NoticeToast
            tone='success'
            label='Готово'
            title={toast}
            icon='✓'
          />
        ) : null}
        {error ? (
          <NoticeToast
            tone='error'
            label='Внимание'
            title={error}
            icon='!'
          />
        ) : null}
      </div>

      {modal ? (
        <ModalOverlay>
          {modal === 'household' ? (
            <TaskListModal
              tasks={sortedTasks}
              onClose={closeModalWithGuard}
              onAdd={openTaskCreateModal}
              onSelectTask={openTaskActions}
            />
          ) : null}

          {modal === 'task-create' ? (
            <TaskFormModal
              mode='create'
              title={taskTitle}
              note={taskNote}
              priority={taskPriority}
              status={taskCreateStatus}
              loading={busyKey === 'create-task' || loading}
              submitLabel='Добавить задачу'
              busyLabel='Добавляю...'
              onTitleChange={setTaskTitle}
              onNoteChange={setTaskNote}
              onPriorityChange={setTaskPriority}
              onSubmit={() => void addTask()}
              onBack={() => setModal('household')}
            />
          ) : null}

          {modal === 'task-actions' && selectedTask ? (
            <TaskActionsModal
              task={selectedTask}
              busyKey={busyKey}
              onClose={closeTaskModals}
              onComplete={() => void completeTask(selectedTask)}
              onCompleteTogether={() => void completeTask(selectedTask, true)}
              onReplace={openTaskReplaceModal}
              onDelete={() => void deleteTask(selectedTask)}
            />
          ) : null}

          {modal === 'task-replace' && selectedTask ? (
            <TaskFormModal
              mode='replace'
              title={replaceTaskTitle}
              note={replaceTaskNote}
              priority={replaceTaskPriority}
              status=''
              loading={busyKey === `replace-task-${selectedTask.id}`}
              submitLabel='Сохранить изменения'
              busyLabel='Сохраняю...'
              onTitleChange={setReplaceTaskTitle}
              onNoteChange={setReplaceTaskNote}
              onPriorityChange={setReplaceTaskPriority}
              onSubmit={() => void replaceTask()}
              onBack={() => setModal('task-actions')}
            />
          ) : null}

          {modal === 'task-journal' ? (
            <TaskJournalModal
              tasks={sortedCompletedTasks}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'shopping-list' ? (
            <ShoppingListModal
              items={sortedShoppingItems}
              onClose={closeModalWithGuard}
              onAdd={openShoppingCreateModal}
              onSelectItem={openShoppingActions}
            />
          ) : null}

          {modal === 'shopping-create' ? (
            <ShoppingFormModal
              mode='create'
              title={productTitle}
              quantity={productQuantity}
              note={productNote}
              urgency={productUrgency}
              status={shoppingCreateStatus}
              loading={busyKey === 'create-product' || loading}
              submitLabel='Добавить покупку'
              busyLabel='Добавляю...'
              onTitleChange={setProductTitle}
              onQuantityChange={setProductQuantity}
              onNoteChange={setProductNote}
              onUrgencyChange={setProductUrgency}
              onSubmit={() => void addShoppingItem()}
              onBack={() => setModal('shopping-list')}
            />
          ) : null}

          {modal === 'shopping-actions' && selectedShoppingItem ? (
            <ShoppingActionsModal
              item={selectedShoppingItem}
              busyKey={busyKey}
              onClose={closeShoppingModals}
              onPurchase={() => void purchaseItem(selectedShoppingItem)}
              onReplace={openReplaceModal}
              onDelete={() => void deleteShoppingItem(selectedShoppingItem)}
            />
          ) : null}

          {modal === 'shopping-replace' && selectedShoppingItem ? (
            <ShoppingFormModal
              mode='replace'
              title={replaceTitle}
              quantity={replaceQuantity}
              note={replaceNote}
              urgency={replaceUrgency}
              status=''
              loading={busyKey === `replace-${selectedShoppingItem.id}`}
              submitLabel='Сохранить замену'
              busyLabel='Сохраняю...'
              onTitleChange={setReplaceTitle}
              onQuantityChange={setReplaceQuantity}
              onNoteChange={setReplaceNote}
              onUrgencyChange={setReplaceUrgency}
              onSubmit={() => void replaceShoppingItem()}
              onBack={() => setModal('shopping-actions')}
            />
          ) : null}
        </ModalOverlay>
      ) : null}

      <div className='mx-auto flex min-h-screen w-full max-w-(--page-max-width) flex-col justify-center gap-4 p-4 sm:p-6'>
        <DashboardHero
          actorName={getActorName(buyer)}
          openTasksCount={openTasks.length}
          shoppingItemsCount={shoppingItems.length}
          onOpenHousehold={() => openMainModal('household')}
          onOpenShopping={() => openMainModal('shopping-list')}
        />

        <JournalSummary
          completedTasksCount={completedTasks.length}
          lastCompletedBy={sortedCompletedTasks[0]?.completedByName ?? 'Пока пусто'}
          lastCompletedAt={
            sortedCompletedTasks[0]?.completedAt
              ? formatRelativeDate(sortedCompletedTasks[0].completedAt)
              : 'Пока пусто'
          }
          onOpenJournal={() => openMainModal('task-journal')}
        />

        {loading ? (
          <motion.section
            variants={reveal}
            initial='hidden'
            animate='visible'
            transition={{ delay: 0.24, duration: 0.35, ease: 'easeOut' }}
            className='rounded-2xl border border-[rgba(15,23,42,0.08)] bg-(--color-surface) p-4 text-sm text-slate-600 shadow-(--shadow-card) sm:p-6'
          >
            Обновляю данные...
          </motion.section>
        ) : null}
      </div>
    </main>
  )
}
