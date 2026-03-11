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

type TaskCatalogItem = {
  id: string
  title: string
  description: string | null
  category: string
  room: string | null
}

type ProductCatalogItem = {
  id: string
  title: string
  description: string | null
  category: string
  unitLabel: string | null
}

type HouseholdTask = {
  id: string
  note: string | null
  addedByName: string
  createdAt: string
  catalogItem: TaskCatalogItem
}

type ShoppingItem = {
  id: string
  urgency: 'soon' | 'out'
  quantityLabel: string | null
  note: string | null
  addedByName: string
  createdAt: string
  catalogItem: ProductCatalogItem
}

type BootstrapResponse = {
  ok: boolean
  taskCatalog: TaskCatalogItem[]
  productCatalog: ProductCatalogItem[]
  openTasks: HouseholdTask[]
  activeShoppingItems: ShoppingItem[]
}

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

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export default function Page() {
  const [buyer, setBuyer] = useState<TelegramUser | undefined>()
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogItem[]>([])
  const [productCatalog, setProductCatalog] = useState<ProductCatalogItem[]>([])
  const [openTasks, setOpenTasks] = useState<HouseholdTask[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [taskNote, setTaskNote] = useState<Record<string, string>>({})
  const [productNote, setProductNote] = useState<Record<string, string>>({})
  const [productQuantity, setProductQuantity] = useState<Record<string, string>>({})
  const [productUrgency, setProductUrgency] = useState<Record<string, 'soon' | 'out'>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const telegram = (window as TelegramWindow).Telegram?.WebApp
    telegram?.ready?.()
    telegram?.expand?.()
    setBuyer(getTelegramUser())
  }, [])

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bootstrap', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Не удалось загрузить семейную доску')
      }

      const payload = (await response.json()) as BootstrapResponse
      setTaskCatalog(payload.taskCatalog)
      setProductCatalog(payload.productCatalog)
      setOpenTasks(payload.openTasks)
      setShoppingItems(payload.activeShoppingItems)
    } catch {
      setError('Не получилось загрузить каталог и текущие списки. Проверь DATABASE_URL и Prisma.')
    } finally {
      setLoading(false)
    }
  }

  async function addTask(item: TaskCatalogItem) {
    const actorName = getActorName(buyer)
    setBusyKey(`task-create-${item.id}`)
    setError('')

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalogItemId: item.id,
          note: taskNote[item.id] ?? '',
          addedByName: actorName,
          addedByUsername: buyer?.username ?? null,
          addedByTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось добавить задачу')
      }

      setTaskNote((current) => ({ ...current, [item.id]: '' }))
      setToast(`Добавили задачу "${item.title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось добавить задачу в общий список.')
    } finally {
      setBusyKey(null)
    }
  }

  async function completeTask(task: HouseholdTask) {
    setBusyKey(`task-toggle-${task.id}`)
    setError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          actorName: getActorName(buyer),
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось завершить задачу')
      }

      setToast(`Задача "${task.catalogItem.title}" выполнена`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось отметить задачу выполненной.')
    } finally {
      setBusyKey(null)
    }
  }

  async function addShoppingItem(item: ProductCatalogItem) {
    const actorName = getActorName(buyer)
    setBusyKey(`product-create-${item.id}`)
    setError('')

    try {
      const response = await fetch('/api/shopping-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalogItemId: item.id,
          urgency: productUrgency[item.id] ?? 'soon',
          quantityLabel: productQuantity[item.id] ?? '',
          note: productNote[item.id] ?? '',
          addedByName: actorName,
          addedByUsername: buyer?.username ?? null,
          addedByTelegramId: buyer?.id ? String(buyer.id) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось добавить продукт')
      }

      setProductQuantity((current) => ({ ...current, [item.id]: '' }))
      setProductNote((current) => ({ ...current, [item.id]: '' }))
      setProductUrgency((current) => ({ ...current, [item.id]: 'soon' }))
      setToast(`Добавили продукт "${item.title}"`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось добавить продукт в список покупок.')
    } finally {
      setBusyKey(null)
    }
  }

  async function purchaseItem(item: ShoppingItem) {
    setBusyKey(`product-toggle-${item.id}`)
    setError('')

    try {
      const response = await fetch(`/api/shopping-items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'purchase',
          actorName: getActorName(buyer),
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось отметить продукт купленным')
      }

      setToast(`Покупка "${item.catalogItem.title}" закрыта`)
      startTransition(() => {
        void loadData()
      })
    } catch {
      setError('Не удалось отметить продукт купленным.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,_#f7f0df_0%,_#efe7d2_35%,_#d6e5db_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
        <motion.section
          variants={cardReveal}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="overflow-hidden rounded-[2rem] border border-black/8 bg-[#18222b] text-white shadow-[0_30px_80px_rgba(24,34,43,0.22)]"
        >
          <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="badge border-none bg-white/10 px-4 py-4 uppercase tracking-[0.28em] text-white/70">
                Telegram family mini app
              </div>
              <div className="space-y-4">
                <h1 className="max-w-[12ch] text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl">
                  Домашние задачи и покупки в одном месте
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/72">
                  Один общий экран для вас обоих: добавляете дела из каталога, собираете список
                  покупок и в любой момент видите, что сейчас актуально по дому.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/7 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-white/55">Сейчас в Mini App</div>
                <div className="mt-3 text-2xl font-bold">{getActorName(buyer)}</div>
                <div className="mt-2 text-sm leading-6 text-white/65">
                  Telegram-пользователь определяется автоматически. Оба участника увидят один и тот
                  же общий список.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] bg-[#f7c548] p-4 text-slate-950">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-700">Задачи</div>
                  <div className="mt-2 text-4xl font-black">{openTasks.length}</div>
                  <div className="mt-2 text-sm text-slate-700">Открыто сейчас</div>
                </div>
                <div className="rounded-[1.5rem] bg-[#8dd5b1] p-4 text-slate-950">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-700">Покупки</div>
                  <div className="mt-2 text-4xl font-black">{shoppingItems.length}</div>
                  <div className="mt-2 text-sm text-slate-700">Нужно купить</div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {toast ? (
          <div className="rounded-[1.4rem] border border-emerald-900/10 bg-emerald-100/80 px-4 py-3 text-sm font-medium text-emerald-950">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.4rem] border border-rose-900/10 bg-rose-100/90 px-4 py-3 text-sm font-medium text-rose-950">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <motion.section
            variants={cardReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
            className="space-y-4 rounded-[2rem] border border-black/8 bg-white/72 p-4 shadow-[0_22px_70px_rgba(52,72,60,0.12)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Каталог задач</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Что нужно сделать по дому</h2>
              </div>
              <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                {taskCatalog.length} шаблонов
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {taskCatalog.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.6rem] border border-black/8 bg-[#f6f1e6] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {item.category}{item.room ? ` • ${item.room}` : ''}
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3>
                    </div>
                    <div className="rounded-full bg-[#18222b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                      Дом
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  <textarea
                    className="mt-4 h-24 w-full rounded-[1.15rem] border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    placeholder="Комментарий, если нужен"
                    value={taskNote[item.id] ?? ''}
                    onChange={(event) =>
                      setTaskNote((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[#18222b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void addTask(item)}
                    disabled={busyKey === `task-create-${item.id}` || loading}
                  >
                    {busyKey === `task-create-${item.id}` ? 'Добавляю...' : 'Добавить в текущие задачи'}
                  </button>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.section
            variants={cardReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.14, duration: 0.4, ease: 'easeOut' }}
            className="space-y-4 rounded-[2rem] border border-black/8 bg-[#fdfcf8]/86 p-4 shadow-[0_22px_70px_rgba(52,72,60,0.12)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Текущие задачи</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Что уже добавлено</h2>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/75 px-4 py-10 text-center text-slate-500">
                Загружаю семейную доску...
              </div>
            ) : openTasks.length ? (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          {task.catalogItem.category}
                        </div>
                        <h3 className="text-lg font-bold text-slate-950">{task.catalogItem.title}</h3>
                        {task.note ? (
                          <p className="text-sm leading-6 text-slate-600">{task.note}</p>
                        ) : null}
                        <div className="text-xs text-slate-500">
                          Добавил(а) {task.addedByName} • {formatRelativeDate(task.createdAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                        onClick={() => void completeTask(task)}
                        disabled={busyKey === `task-toggle-${task.id}`}
                      >
                        {busyKey === `task-toggle-${task.id}` ? '...' : 'Сделано'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/75 px-4 py-10 text-center text-slate-500">
                Пока пусто. Добавьте первую задачу из каталога слева.
              </div>
            )}
          </motion.section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            variants={cardReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.18, duration: 0.4, ease: 'easeOut' }}
            className="space-y-4 rounded-[2rem] border border-black/8 bg-white/72 p-4 shadow-[0_22px_70px_rgba(52,72,60,0.12)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Каталог продуктов</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Что докупить в ближайшее время</h2>
              </div>
              <div className="rounded-full bg-[#18222b] px-4 py-2 text-sm font-semibold text-white">
                {productCatalog.length} позиций
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {productCatalog.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.6rem] border border-black/8 bg-[#e7f3ea] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {item.category}{item.unitLabel ? ` • ${item.unitLabel}` : ''}
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3>
                    </div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                      Магазин
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <select
                      className="rounded-[1rem] border border-black/10 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-slate-900"
                      value={productUrgency[item.id] ?? 'soon'}
                      onChange={(event) =>
                        setProductUrgency((current) => ({
                          ...current,
                          [item.id]: event.target.value === 'out' ? 'out' : 'soon',
                        }))
                      }
                    >
                      <option value="soon">Скоро закончится</option>
                      <option value="out">Уже закончилось</option>
                    </select>
                    <input
                      className="rounded-[1rem] border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      placeholder={item.unitLabel ? `Сколько (${item.unitLabel})` : 'Сколько нужно'}
                      value={productQuantity[item.id] ?? ''}
                      onChange={(event) =>
                        setProductQuantity((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <textarea
                    className="mt-3 h-24 w-full rounded-[1.15rem] border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    placeholder="Комментарий или уточнение"
                    value={productNote[item.id] ?? ''}
                    onChange={(event) =>
                      setProductNote((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[#18222b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void addShoppingItem(item)}
                    disabled={busyKey === `product-create-${item.id}` || loading}
                  >
                    {busyKey === `product-create-${item.id}` ? 'Добавляю...' : 'Добавить в список покупок'}
                  </button>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.section
            variants={cardReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.24, duration: 0.4, ease: 'easeOut' }}
            className="space-y-4 rounded-[2rem] border border-black/8 bg-[#fdfcf8]/86 p-4 shadow-[0_22px_70px_rgba(52,72,60,0.12)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Текущие покупки</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Что нужно купить</h2>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/75 px-4 py-10 text-center text-slate-500">
                Загружаю список покупок...
              </div>
            ) : shoppingItems.length ? (
              <div className="space-y-3">
                {shoppingItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                            {item.catalogItem.category}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              item.urgency === 'out'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.urgency === 'out' ? 'Закончился' : 'Скоро закончится'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-950">{item.catalogItem.title}</h3>
                        {item.quantityLabel ? (
                          <div className="text-sm text-slate-700">Количество: {item.quantityLabel}</div>
                        ) : null}
                        {item.note ? (
                          <p className="text-sm leading-6 text-slate-600">{item.note}</p>
                        ) : null}
                        <div className="text-xs text-slate-500">
                          Добавил(а) {item.addedByName} • {formatRelativeDate(item.createdAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-[#8dd5b1] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#79c8a1] disabled:cursor-wait disabled:opacity-60"
                        onClick={() => void purchaseItem(item)}
                        disabled={busyKey === `product-toggle-${item.id}`}
                      >
                        {busyKey === `product-toggle-${item.id}` ? '...' : 'Куплено'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/75 px-4 py-10 text-center text-slate-500">
                Список покупок пуст. Добавьте продукты из каталога.
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </main>
  )
}
