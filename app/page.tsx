'use client'

import { motion } from 'framer-motion'
import { startTransition, useEffect, useState } from 'react'

type TelegramUser = {
  first_name?: string
  last_name?: string
  username?: string
  id?: number
}

type TelegramWebApp = {
  ready?: () => void
  expand?: () => void
  initData?: string
  initDataUnsafe?: {
    user?: TelegramUser
  }
}

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}

type HouseholdTask = {
  id: string
  title: string
  note: string | null
  priority: 'normal' | 'urgent'
  addedByName: string
  createdAt: string
}

type ShoppingItem = {
  id: string
  title: string
  urgency: 'soon' | 'out'
  quantityLabel: string | null
  note: string | null
  addedByName: string
  createdAt: string
}

type BootstrapResponse = {
  ok: boolean
  openTasks: HouseholdTask[]
  activeShoppingItems: ShoppingItem[]
}

type ModalKey =
  | 'household'
  | 'task-actions'
  | 'task-replace'
  | 'shopping-list'
  | 'shopping-actions'
  | 'shopping-replace'
  | null

function parseUserFromTelegramParams(rawParams: string) {
  const params = new URLSearchParams(rawParams)
  const rawUser = params.get('user')

  if (!rawUser) {
    return undefined
  }

  try {
    return JSON.parse(rawUser) as TelegramUser
  } catch {
    return undefined
  }
}

function getTelegramUser() {
  const telegram = (window as TelegramWindow).Telegram?.WebApp
  const sdkUser = telegram?.initDataUnsafe?.user

  if (sdkUser) {
    return sdkUser
  }

  if (telegram?.initData) {
    const parsedUser = parseUserFromTelegramParams(telegram.initData)
    if (parsedUser) {
      return parsedUser
    }
  }

  const searchUser = parseUserFromTelegramParams(window.location.search.slice(1))
  if (searchUser) {
    return searchUser
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  return parseUserFromTelegramParams(hash)
}

function getActorName(user?: TelegramUser) {
  if (!user) return 'Домашний диспетчер'
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  if (user.username) return `@${user.username}`
  if (user.id) return `id:${user.id}`
  return 'Домашний диспетчер'
}

function formatRelativeDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sortTasks(tasks: HouseholdTask[]) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = Number(right.priority === 'urgent') - Number(left.priority === 'urgent')

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function sortShoppingItems(items: ShoppingItem[]) {
  return [...items].sort((left, right) => {
    const urgencyDiff = Number(right.urgency === 'out') - Number(left.urgency === 'out')

    if (urgencyDiff !== 0) {
      return urgencyDiff
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export default function Page() {
  const [buyer, setBuyer] = useState<TelegramUser | undefined>()
  const [modal, setModal] = useState<ModalKey>(null)
  const [modalCooldownUntil, setModalCooldownUntil] = useState(0)
  const [openTasks, setOpenTasks] = useState<HouseholdTask[]>([])
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
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const sortedTasks = sortTasks(openTasks)
  const sortedShoppingItems = sortShoppingItems(shoppingItems)

  useEffect(() => {
    const telegram = (window as TelegramWindow).Telegram?.WebApp
    telegram?.ready?.()
    telegram?.expand?.()
    setBuyer(getTelegramUser())
  }, [])

  useEffect(() => {
    void loadData()
  }, [])

  function canOpenModal() {
    return Date.now() >= modalCooldownUntil
  }

  function closeModalWithGuard() {
    setModalCooldownUntil(Date.now() + 300)
    setModal(null)
  }

  function openMainModal(nextModal: Extract<ModalKey, 'household' | 'shopping-list'>) {
    if (!canOpenModal()) {
      return
    }

    setModal(nextModal)
  }

  function openTaskActions(task: HouseholdTask) {
    if (!canOpenModal()) {
      return
    }

    setSelectedTask(task)
    setModal('task-actions')
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
    setModalCooldownUntil(Date.now() + 300)
    setModal(null)
    setSelectedTask(null)
    setReplaceTaskTitle('')
    setReplaceTaskNote('')
    setReplaceTaskPriority('normal')
  }

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bootstrap', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('bootstrap failed')
      }

      const payload = (await response.json()) as BootstrapResponse
      setOpenTasks(payload.openTasks)
      setShoppingItems(payload.activeShoppingItems)
    } catch {
      setError('Не получилось загрузить текущие списки. Проверь DATABASE_URL и Prisma.')
    } finally {
      setLoading(false)
    }
  }

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

  function closeShoppingModals() {
    setModalCooldownUntil(Date.now() + 300)
    setModal(null)
    setSelectedShoppingItem(null)
    setReplaceTitle('')
    setReplaceQuantity('')
    setReplaceNote('')
    setReplaceUrgency('soon')
  }

  async function addTask() {
    const title = taskTitle.trim()

    if (!title) {
      setError('Впиши, какое действие нужно сделать по дому.')
      return
    }

    setBusyKey('create-task')
    setError('')

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          note: taskNote,
          priority: taskPriority,
          addedByName: getActorName(buyer),
          addedByUsername: buyer?.username ?? null,
          addedByTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('task create failed')
      }

      setTaskTitle('')
      setTaskNote('')
      setTaskPriority('normal')
      setToast(`Добавили в быт: "${title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось добавить бытовую задачу.')
    } finally {
      setBusyKey(null)
    }
  }

  async function addShoppingItem() {
    const title = productTitle.trim()

    if (!title) {
      setError('Впиши название продукта или товара.')
      return
    }

    setBusyKey('create-product')
    setError('')

    try {
      const response = await fetch('/api/shopping-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          urgency: productUrgency,
          quantityLabel: productQuantity,
          note: productNote,
          addedByName: getActorName(buyer),
          addedByUsername: buyer?.username ?? null,
          addedByTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('shopping create failed')
      }

      setProductTitle('')
      setProductQuantity('')
      setProductNote('')
      setProductUrgency('soon')
      setToast(`Добавили в покупки: "${title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось добавить покупку.')
    } finally {
      setBusyKey(null)
    }
  }

  async function completeTask(task: HouseholdTask) {
    setBusyKey(`task-${task.id}`)
    setError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          actorName: getActorName(buyer),
          actorUsername: buyer?.username ?? null,
          actorTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('task update failed')
      }

      closeTaskModals()
      setToast(`Закрыли задачу "${task.title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось отметить задачу выполненной.')
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteTask(task: HouseholdTask) {
    setBusyKey(`delete-task-${task.id}`)
    setError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('task delete failed')
      }

      closeTaskModals()
      setToast(`Удалили задачу "${task.title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось удалить задачу.')
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
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          actorName: getActorName(buyer),
          actorUsername: buyer?.username ?? null,
          actorTelegramId: buyer?.id ? String(buyer.id) : null,
          title,
          note: replaceTaskNote,
          priority: replaceTaskPriority,
        }),
      })

      if (!response.ok) {
        throw new Error('task replace failed')
      }

      closeTaskModals()
      setToast(`Обновили задачу: "${title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось изменить задачу.')
    } finally {
      setBusyKey(null)
    }
  }

  async function purchaseItem(item: ShoppingItem) {
    setBusyKey(`product-${item.id}`)
    setError('')

    try {
      const response = await fetch(`/api/shopping-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          actorName: getActorName(buyer),
          actorUsername: buyer?.username ?? null,
          actorTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('shopping update failed')
      }

      closeShoppingModals()
      setToast(`Отметили купленным "${item.title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось отметить покупку.')
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteShoppingItem(item: ShoppingItem) {
    setBusyKey(`delete-${item.id}`)
    setError('')

    try {
      const response = await fetch(`/api/shopping-items/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('shopping delete failed')
      }

      closeShoppingModals()
      setToast(`Удалили "${item.title}" из покупок`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось удалить покупку.')
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
      const response = await fetch(`/api/shopping-items/${selectedShoppingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          actorName: getActorName(buyer),
          actorUsername: buyer?.username ?? null,
          actorTelegramId: buyer?.id ? String(buyer.id) : null,
          title,
          urgency: replaceUrgency,
          quantityLabel: replaceQuantity,
          note: replaceNote,
        }),
      })

      if (!response.ok) {
        throw new Error('shopping replace failed')
      }

      closeShoppingModals()
      setToast(`Обновили покупку: "${title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось заменить покупку.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_20%),linear-gradient(180deg,_#f3efe3_0%,_#ebe7d8_45%,_#dde7df_100%)] text-slate-950'>
      {modal ? (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-md sm:items-center sm:p-6'>
          {modal === 'household' ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#13202f] text-white shadow-2xl'
            >
              <div className='border-b border-white/10 px-5 py-5 sm:px-6'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <div className='text-xs uppercase tracking-[0.3em] text-white/50'>БЫТ</div>
                    <h2 className='mt-2 text-3xl font-black'>Все текущие задачи</h2>
                  </div>
                  <button
                    type='button'
                    className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10'
                    onClick={closeModalWithGuard}
                  >
                    Закрыть
                  </button>
                </div>
              </div>

              <div className='flex-1 overflow-y-auto px-5 py-5 sm:px-6'>
                {sortedTasks.length ? (
                  <div className='space-y-3'>
                    {sortedTasks.map(task => (
                      <button
                        key={task.id}
                        type='button'
                        className='w-full rounded-[1.4rem] border border-white/10 bg-white/6 p-4 text-left transition hover:bg-white/10'
                        onClick={() => openTaskActions(task)}
                      >
                        <div className='space-y-2'>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                              task.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {task.priority === 'urgent' ? 'Срочно' : 'Обычно'}
                          </span>
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
                  <div className='rounded-[1.4rem] border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
                    Сейчас по быту ничего не висит.
                  </div>
                )}
              </div>

              <div className='border-t border-white/10 px-5 py-5 sm:px-6'>
                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-white px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-white/90'
                  onClick={closeModalWithGuard}
                >
                  Ознакомлен
                </button>
              </div>
            </motion.div>
          ) : null}

          {modal === 'task-actions' && selectedTask ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='w-full max-w-md rounded-[2rem] border border-white/10 bg-[#13202f] p-5 text-white shadow-2xl'
            >
              <div className='space-y-2'>
                <div className='text-xs uppercase tracking-[0.3em] text-white/50'>БЫТ</div>
                <h2 className='text-3xl font-black'>{selectedTask.title}</h2>
                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                    selectedTask.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedTask.priority === 'urgent' ? 'Срочно' : 'Обычно'}
                </div>
                {selectedTask.note ? (
                  <div className='text-sm leading-6 text-white/65'>{selectedTask.note}</div>
                ) : null}
                <div className='text-sm text-white/60'>Выбери действие для этой задачи.</div>
              </div>

              <div className='mt-5 space-y-3'>
                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#f3c54b] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#eabf36] disabled:opacity-60'
                  onClick={() => void completeTask(selectedTask)}
                  disabled={busyKey === `task-${selectedTask.id}`}
                >
                  {busyKey === `task-${selectedTask.id}` ? 'Обновляю...' : 'Отметить выполненной'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#8fd4b0] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#7bc8a0]'
                  onClick={openTaskReplaceModal}
                >
                  Изменить
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-rose-100 px-4 py-4 text-base font-semibold text-rose-800 transition hover:bg-rose-200 disabled:opacity-60'
                  onClick={() => void deleteTask(selectedTask)}
                  disabled={busyKey === `delete-task-${selectedTask.id}`}
                >
                  {busyKey === `delete-task-${selectedTask.id}` ? 'Удаляю...' : 'Удалить'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/10'
                  onClick={closeTaskModals}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          ) : null}

          {modal === 'task-replace' && selectedTask ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='w-full max-w-md rounded-[2rem] border border-white/10 bg-[#13202f] p-5 text-white shadow-2xl'
            >
              <div className='space-y-2'>
                <div className='text-xs uppercase tracking-[0.3em] text-white/50'>
                  Изменить задачу
                </div>
                <h2 className='text-3xl font-black'>Новая форма</h2>
              </div>

              <div className='mt-5 space-y-3'>
                <input
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  placeholder='Новое название'
                  value={replaceTaskTitle}
                  onChange={event => setReplaceTaskTitle(event.target.value)}
                />

                <select
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  value={replaceTaskPriority}
                  onChange={event =>
                    setReplaceTaskPriority(event.target.value === 'urgent' ? 'urgent' : 'normal')
                  }
                >
                  <option value='normal'>Обычный приоритет</option>
                  <option value='urgent'>Срочно</option>
                </select>

                <textarea
                  className='h-28 w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  placeholder='Комментарий'
                  value={replaceTaskNote}
                  onChange={event => setReplaceTaskNote(event.target.value)}
                />

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#8fd4b0] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#7bc8a0] disabled:opacity-60'
                  onClick={() => void replaceTask()}
                  disabled={busyKey === `replace-task-${selectedTask.id}`}
                >
                  {busyKey === `replace-task-${selectedTask.id}`
                    ? 'Сохраняю...'
                    : 'Сохранить изменения'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/10'
                  onClick={() => setModal('task-actions')}
                >
                  Назад
                </button>
              </div>
            </motion.div>
          ) : null}

          {modal === 'shopping-list' ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#13202f] text-white shadow-2xl'
            >
              <div className='border-b border-white/10 px-5 py-5 sm:px-6'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <div className='text-xs uppercase tracking-[0.3em] text-white/50'>ПОКУПКИ</div>
                    <h2 className='mt-2 text-3xl font-black'>Все текущие покупки</h2>
                  </div>
                  <button
                    type='button'
                    className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10'
                    onClick={closeModalWithGuard}
                  >
                    Закрыть
                  </button>
                </div>
              </div>

              <div className='flex-1 overflow-y-auto px-5 py-5 sm:px-6'>
                {sortedShoppingItems.length ? (
                  <div className='space-y-3'>
                    {sortedShoppingItems.map(item => (
                      <button
                        key={item.id}
                        type='button'
                        className='w-full rounded-[1.4rem] border border-white/10 bg-white/6 p-4 text-left transition hover:bg-white/10'
                        onClick={() => openShoppingActions(item)}
                      >
                        <div className='space-y-2'>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                              item.urgency === 'out'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.urgency === 'out' ? 'Закончилось' : 'Заканчивается'}
                          </span>
                          <h3 className='text-xl font-bold'>{item.title}</h3>
                          {item.quantityLabel ? (
                            <div className='text-sm text-white/80'>
                              Количество: {item.quantityLabel}
                            </div>
                          ) : null}
                          {item.note ? (
                            <p className='text-sm leading-6 text-white/70'>{item.note}</p>
                          ) : null}
                          <div className='text-xs text-white/45'>
                            Добавил(а) {item.addedByName} • {formatRelativeDate(item.createdAt)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='rounded-[1.4rem] border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
                    Сейчас список покупок пуст.
                  </div>
                )}
              </div>

              <div className='border-t border-white/10 px-5 py-5 sm:px-6'>
                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-white px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-white/90'
                  onClick={closeModalWithGuard}
                >
                  Ознакомлен
                </button>
              </div>
            </motion.div>
          ) : null}

          {modal === 'shopping-actions' && selectedShoppingItem ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='w-full max-w-md rounded-[2rem] border border-white/10 bg-[#13202f] p-5 text-white shadow-2xl'
            >
              <div className='space-y-2'>
                <div className='text-xs uppercase tracking-[0.3em] text-white/50'>ПОКУПКИ</div>
                <h2 className='text-3xl font-black'>{selectedShoppingItem.title}</h2>
                {selectedShoppingItem.quantityLabel ? (
                  <div className='text-sm text-white/80'>
                    Количество: {selectedShoppingItem.quantityLabel}
                  </div>
                ) : null}
                {selectedShoppingItem.note ? (
                  <div className='text-sm leading-6 text-white/65'>{selectedShoppingItem.note}</div>
                ) : null}
                <div className='text-sm text-white/60'>Выбери действие для этой позиции.</div>
              </div>

              <div className='mt-5 space-y-3'>
                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#8fd4b0] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#7bc8a0] disabled:opacity-60'
                  onClick={() => void purchaseItem(selectedShoppingItem)}
                  disabled={busyKey === `product-${selectedShoppingItem.id}`}
                >
                  {busyKey === `product-${selectedShoppingItem.id}`
                    ? 'Обновляю...'
                    : 'Отметить купленным'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#f3c54b] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#eabf36]'
                  onClick={openReplaceModal}
                >
                  Заменить
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-rose-100 px-4 py-4 text-base font-semibold text-rose-800 transition hover:bg-rose-200 disabled:opacity-60'
                  onClick={() => void deleteShoppingItem(selectedShoppingItem)}
                  disabled={busyKey === `delete-${selectedShoppingItem.id}`}
                >
                  {busyKey === `delete-${selectedShoppingItem.id}` ? 'Удаляю...' : 'Удалить'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/10'
                  onClick={closeShoppingModals}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          ) : null}

          {modal === 'shopping-replace' && selectedShoppingItem ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className='w-full max-w-md rounded-[2rem] border border-white/10 bg-[#13202f] p-5 text-white shadow-2xl'
            >
              <div className='space-y-2'>
                <div className='text-xs uppercase tracking-[0.3em] text-white/50'>
                  Заменить позицию
                </div>
                <h2 className='text-3xl font-black'>Новая форма</h2>
              </div>

              <div className='mt-5 space-y-3'>
                <input
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  placeholder='Новое название'
                  value={replaceTitle}
                  onChange={event => setReplaceTitle(event.target.value)}
                />

                <select
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  value={replaceUrgency}
                  onChange={event =>
                    setReplaceUrgency(event.target.value === 'out' ? 'out' : 'soon')
                  }
                >
                  <option value='soon'>Заканчивается</option>
                  <option value='out'>Закончилось</option>
                </select>

                <input
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  placeholder='Количество или упаковка'
                  value={replaceQuantity}
                  onChange={event => setReplaceQuantity(event.target.value)}
                />

                <textarea
                  className='h-28 w-full rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 text-base text-white outline-none transition focus:border-white/30'
                  placeholder='Комментарий'
                  value={replaceNote}
                  onChange={event => setReplaceNote(event.target.value)}
                />

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] bg-[#8fd4b0] px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#7bc8a0] disabled:opacity-60'
                  onClick={() => void replaceShoppingItem()}
                  disabled={busyKey === `replace-${selectedShoppingItem.id}`}
                >
                  {busyKey === `replace-${selectedShoppingItem.id}`
                    ? 'Сохраняю...'
                    : 'Сохранить замену'}
                </button>

                <button
                  type='button'
                  className='w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/10'
                  onClick={() => setModal('shopping-actions')}
                >
                  Назад
                </button>
              </div>
            </motion.div>
          ) : null}
        </div>
      ) : null}

      <div className='mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6'>
        <motion.section
          variants={reveal}
          initial='hidden'
          animate='visible'
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className='overflow-hidden rounded-[2rem] border border-black/8 bg-[#13202f] text-white shadow-[0_30px_80px_rgba(17,24,39,0.22)]'
        >
          <div className='space-y-6 px-5 py-6 sm:px-8 sm:py-8'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='space-y-3'>
                <div className='badge border-none bg-white/10 px-4 py-4 uppercase tracking-[0.26em] text-white/70'>
                  Family Plane
                </div>
                <h1 className='max-w-[13ch] text-4xl font-black leading-[0.92] sm:text-5xl'>
                  Домашние дела без лишних экранов
                </h1>
              </div>

              <div className='rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4'>
                <div className='text-xs uppercase tracking-[0.24em] text-white/50'>
                  Сейчас в Mini App
                </div>
                <div className='mt-2 text-2xl font-bold'>{getActorName(buyer)}</div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <button
                type='button'
                className='rounded-[1.5rem] bg-[#f3c54b] px-4 py-4 text-left text-slate-950 transition hover:scale-[0.99]'
                onClick={() => openMainModal('household')}
              >
                <div className='text-xs uppercase tracking-[0.28em]'>БЫТ</div>
                <div className='mt-3 text-3xl font-black'>{openTasks.length}</div>
                <div className='mt-1 text-base'>Открыть весь список</div>
              </button>

              <button
                type='button'
                className='rounded-[1.5rem] bg-[#8fd4b0] px-4 py-4 text-left text-slate-950 transition hover:scale-[0.99]'
                onClick={() => openMainModal('shopping-list')}
              >
                <div className='text-xs uppercase tracking-[0.28em]'>ПОКУПКИ</div>
                <div className='mt-3 text-3xl font-black'>{shoppingItems.length}</div>
                <div className='mt-1 text-base'>Открыть весь список</div>
              </button>
            </div>
          </div>
        </motion.section>

        {toast ? (
          <div className='rounded-[1.25rem] border border-emerald-900/10 bg-emerald-100/80 px-4 py-3 text-sm font-medium text-emerald-950'>
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className='rounded-[1.25rem] border border-rose-900/10 bg-rose-100/90 px-4 py-3 text-sm font-medium text-rose-950'>
            {error}
          </div>
        ) : null}

        <div className='grid gap-4 lg:grid-cols-2'>
          <motion.section
            variants={reveal}
            initial='hidden'
            animate='visible'
            transition={{ delay: 0.06, duration: 0.35, ease: 'easeOut' }}
            className='flex flex-col rounded-[2rem] border border-black/8 bg-white/80 p-5 shadow-[0_22px_70px_rgba(52,72,60,0.1)]'
          >
            <div className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.28em] text-slate-500'>
                Новая бытовая задача
              </div>
              <h2 className='text-3xl font-black'>Что нужно сделать</h2>
            </div>

            <div className='mt-5 space-y-3'>
              <input
                className='w-full rounded-[1.2rem] border border-black/10 bg-[#f8f5ec] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                placeholder='Например: разобрать сушилку'
                value={taskTitle}
                onChange={event => setTaskTitle(event.target.value)}
              />

              <select
                className='w-full rounded-[1.2rem] border border-black/10 bg-[#f8f5ec] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                value={taskPriority}
                onChange={event =>
                  setTaskPriority(event.target.value === 'urgent' ? 'urgent' : 'normal')
                }
              >
                <option value='normal'>Обычный приоритет</option>
                <option value='urgent'>Срочно</option>
              </select>

              <textarea
                className='h-28 w-full rounded-[1.2rem] border border-black/10 bg-[#f8f5ec] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                placeholder='Комментарий или детали'
                value={taskNote}
                onChange={event => setTaskNote(event.target.value)}
              />
            </div>
            <button
              type='button'
              className='mt-auto w-full rounded-[1.2rem] bg-[#13202f] px-4 py-4 text-base font-semibold text-white transition hover:bg-black disabled:opacity-60'
              onClick={() => void addTask()}
              disabled={busyKey === 'create-task' || loading}
            >
              {busyKey === 'create-task' ? 'Добавляю...' : 'Добавить в БЫТ'}
            </button>
          </motion.section>

          <motion.section
            variants={reveal}
            initial='hidden'
            animate='visible'
            transition={{ delay: 0.12, duration: 0.35, ease: 'easeOut' }}
            className='rounded-[2rem] border border-black/8 bg-white/80 p-5 shadow-[0_22px_70px_rgba(52,72,60,0.1)]'
          >
            <div className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.28em] text-slate-500'>
                Новая покупка
              </div>
              <h2 className='text-3xl font-black'>Что купить</h2>
            </div>

            <div className='mt-5 space-y-3'>
              <input
                className='w-full rounded-[1.2rem] border border-black/10 bg-[#eef7f0] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                placeholder='Например: овсяное молоко'
                value={productTitle}
                onChange={event => setProductTitle(event.target.value)}
              />

              <select
                className='w-full rounded-[1.2rem] border border-black/10 bg-[#eef7f0] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                value={productUrgency}
                onChange={event => setProductUrgency(event.target.value === 'out' ? 'out' : 'soon')}
              >
                <option value='soon'>Заканчивается</option>
                <option value='out'>Закончилось</option>
              </select>

              <input
                className='w-full rounded-[1.2rem] border border-black/10 bg-[#eef7f0] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                placeholder='Количество или упаковка'
                value={productQuantity}
                onChange={event => setProductQuantity(event.target.value)}
              />

              <textarea
                className='h-28 w-full rounded-[1.2rem] border border-black/10 bg-[#eef7f0] px-4 py-4 text-base outline-none transition focus:border-slate-950'
                placeholder='Комментарий: бренд, магазин, пожелание'
                value={productNote}
                onChange={event => setProductNote(event.target.value)}
              />

              <button
                type='button'
                className='w-full rounded-[1.2rem] bg-[#13202f] px-4 py-4 text-base font-semibold text-white transition hover:bg-black disabled:opacity-60'
                onClick={() => void addShoppingItem()}
                disabled={busyKey === 'create-product' || loading}
              >
                {busyKey === 'create-product' ? 'Добавляю...' : 'Добавить в ПОКУПКИ'}
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  )
}
