'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import { ModalOverlay } from '@/components/ui/app-modal'
import { NoticeToast } from '@/components/ui/notice-toast'
import { BonusShopModal } from '@/features/home/components/bonus-shop-modal'
import { DashboardHero } from '@/features/home/components/dashboard-hero'
import { HouseholdOnboarding } from '@/features/home/components/household-onboarding'
import { HouseholdProfileModal } from '@/features/home/components/household-profile-modal'
import { JournalSummary } from '@/features/home/components/journal-summary'
import { MonthlyRatingModal } from '@/features/home/components/monthly-rating-modal'
import { ShoppingActionsModal } from '@/features/shopping/components/shopping-actions-modal'
import { ShoppingFormModal } from '@/features/shopping/components/shopping-form-modal'
import { ShoppingListModal } from '@/features/shopping/components/shopping-list-modal'
import { TaskActionsModal } from '@/features/tasks/components/task-actions-modal'
import { TaskFormModal } from '@/features/tasks/components/task-form-modal'
import { LastCompletedTaskModal } from '@/features/tasks/components/last-completed-task-modal'
import { TaskJournalModal } from '@/features/tasks/components/task-journal-modal'
import { TaskListModal } from '@/features/tasks/components/task-list-modal'
import { buildMonthlyRatingSummary } from '@/shared/lib/monthly-rating'
import { normalizeInviteCode } from '@/shared/lib/household'
import {
  formatRelativeDate,
  sortCompletedTasks,
  sortShoppingItems,
  sortTasks,
} from '@/shared/lib/format'
import { formatPoints } from '@/shared/lib/bonus-shop'
import { getActorName, getTelegramInitData, getTelegramUser } from '@/shared/lib/telegram'
import type {
  BonusPurchase,
  BootstrapResponse,
  FetchOptions,
  HouseholdProfile,
  HouseholdSummary,
  HouseholdTask,
  MonthlyLeaderboardEntry,
  ModalKey,
  MonthlyReport,
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

function toDeadlineParts(value?: string | null) {
  if (!value) {
    return { day: '', time: '' }
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return { day: '', time: '' }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(todayStart.getDate() + 1)
  const dayAfterTomorrowStart = new Date(todayStart)
  dayAfterTomorrowStart.setDate(todayStart.getDate() + 2)

  let day = ''

  if (date >= todayStart && date < tomorrowStart) {
    day = 'today'
  } else if (date >= tomorrowStart && date < dayAfterTomorrowStart) {
    day = 'tomorrow'
  }

  return {
    day,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

function normalizeDeadlineTime(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function buildDeadlineIso(day: string, time: string) {
  if (!day || !time) {
    return ''
  }

  const match = time.match(/^(\d{2}):(\d{2})$/)

  if (!match) {
    return ''
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return ''
  }

  const nextValue = new Date()
  nextValue.setSeconds(0, 0)
  nextValue.setHours(hours, minutes, 0, 0)

  if (day === 'tomorrow') {
    nextValue.setDate(nextValue.getDate() + 1)
  } else if (day !== 'today') {
    return ''
  }

  if (Number.isNaN(nextValue.getTime())) {
    return ''
  }

  return nextValue.toISOString()
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
  const [monthlyLeaderboardEntries, setMonthlyLeaderboardEntries] = useState<MonthlyLeaderboardEntry[]>([])
  const [monthlyTeamBonusPoints, setMonthlyTeamBonusPoints] = useState(0)
  const [participantNames, setParticipantNames] = useState<string[]>([])
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'active'>('loading')
  const [currentUserBonusBalanceUnits, setCurrentUserBonusBalanceUnits] = useState(0)
  const [household, setHousehold] = useState<HouseholdSummary | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<HouseholdProfile>({
    totalExp: 0,
    currentLevel: 0,
    bonusBalanceUnits: 0,
    currentLevelThreshold: 0,
    nextLevel: 1,
    nextLevelThreshold: 100,
    expIntoCurrentLevel: 0,
    expToNextLevel: 100,
    completedTasksCount: 0,
    fastTasksCount: 0,
    overdueTasksCount: 0,
    levelBonusUnits: 0,
    recentEvents: [],
  })
  const [bonusPurchases, setBonusPurchases] = useState<BonusPurchase[]>([])
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [selectedTask, setSelectedTask] = useState<HouseholdTask | null>(null)
  const [selectedShoppingItem, setSelectedShoppingItem] = useState<ShoppingItem | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskDeadlineDay, setTaskDeadlineDay] = useState('')
  const [taskDeadlineTime, setTaskDeadlineTime] = useState('')
  const [productTitle, setProductTitle] = useState('')
  const [productQuantity, setProductQuantity] = useState('')
  const [productNote, setProductNote] = useState('')
  const [productUrgency, setProductUrgency] = useState<'soon' | 'out' | 'without'>('soon')
  const [replaceTaskTitle, setReplaceTaskTitle] = useState('')
  const [replaceTaskNote, setReplaceTaskNote] = useState('')
  const [replaceTaskDeadlineDay, setReplaceTaskDeadlineDay] = useState('')
  const [replaceTaskDeadlineTime, setReplaceTaskDeadlineTime] = useState('')
  const [replaceTitle, setReplaceTitle] = useState('')
  const [replaceQuantity, setReplaceQuantity] = useState('')
  const [replaceNote, setReplaceNote] = useState('')
  const [replaceUrgency, setReplaceUrgency] = useState<'soon' | 'out' | 'without'>('soon')
  const [createHouseholdName, setCreateHouseholdName] = useState('')
  const [joinHouseholdCode, setJoinHouseholdCode] = useState('')
  const [customInviteCode, setCustomInviteCode] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [taskCreateStatus, setTaskCreateStatus] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [shoppingCreateStatus, setShoppingCreateStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const sortedTasks = sortTasks(openTasks)
  const sortedCompletedTasks = sortCompletedTasks(completedTasks)
  const sortedShoppingItems = sortShoppingItems(shoppingItems)
  const monthlyRatingSummary = buildMonthlyRatingSummary(
    monthlyLeaderboardEntries,
    monthlyTeamBonusPoints,
    getActorName(buyer),
  )

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
    nextModal: Extract<ModalKey, 'household' | 'shopping-list' | 'task-journal' | 'last-completed-task' | 'leaderboard' | 'bonus-shop' | 'profile'>,
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
    setTaskDeadlineDay('')
    setTaskDeadlineTime('')
    setModal('task-create')
  }

  function openTaskReplaceModal() {
    if (!selectedTask) {
      return
    }

    setReplaceTaskTitle(selectedTask.title)
    setReplaceTaskNote(selectedTask.note ?? '')
    const deadlineParts = toDeadlineParts(selectedTask.deadlineAt)
    setReplaceTaskDeadlineDay(deadlineParts.day)
    setReplaceTaskDeadlineTime(deadlineParts.time)
    setModal('task-replace')
  }

  function closeTaskModals() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
    setSelectedTask(null)
    setReplaceTaskTitle('')
    setReplaceTaskNote('')
    setReplaceTaskDeadlineDay('')
    setReplaceTaskDeadlineTime('')
    setTaskDeadlineDay('')
    setTaskDeadlineTime('')
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

        if (payload.state === 'onboarding') {
          setAppState('onboarding')
          setOpenTasks([])
          setCompletedTasks([])
          setMonthlyLeaderboardEntries([])
          setMonthlyTeamBonusPoints(0)
          setParticipantNames([])
          setCurrentUserBonusBalanceUnits(0)
          setHousehold(null)
          setCurrentUserProfile({
            totalExp: 0,
            currentLevel: 0,
            bonusBalanceUnits: 0,
            currentLevelThreshold: 0,
            nextLevel: 1,
            nextLevelThreshold: 100,
            expIntoCurrentLevel: 0,
            expToNextLevel: 100,
            completedTasksCount: 0,
            fastTasksCount: 0,
            overdueTasksCount: 0,
            levelBonusUnits: 0,
            recentEvents: [],
          })
          setBonusPurchases([])
          setMonthlyReports([])
          setShoppingItems([])
          setModal(null)
          return
        }

        setAppState('active')
        setOnboardingStatus('')
        setOpenTasks(payload.openTasks)
        setCompletedTasks(payload.completedTasks)
        setMonthlyLeaderboardEntries(payload.monthlyLeaderboardEntries)
        setMonthlyTeamBonusPoints(payload.monthlyTeamBonusPoints)
        setParticipantNames(payload.participantNames)
        setCurrentUserBonusBalanceUnits(payload.currentUserBonusBalanceUnits)
        setHousehold(payload.household)
        setCustomInviteCode(payload.household.activeInvite?.code ?? '')
        setCurrentUserProfile(payload.currentUserProfile)
        setBonusPurchases(payload.bonusPurchases)
        setMonthlyReports(payload.monthlyReports)
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
    if (!telegramInitData || appState !== 'active') {
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
  }, [appState, telegramInitData, loadData])

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
    const deadlineAt = buildDeadlineIso(taskDeadlineDay, taskDeadlineTime)

    if (!title) {
      setError('Впиши, какое действие нужно сделать по дому.')
      setTaskCreateStatus('Ошибка: впиши задачу.')
      return
    }

    if (!deadlineAt) {
      setError('Укажи дедлайн задачи в пределах ближайших 24 часов.')
      setTaskCreateStatus('Ошибка: укажи дедлайн.')
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
          deadlineAt,
        }),
      })

      if (!response.ok) {
        throw new Error('task create failed')
      }

      const payload = (await response.json()) as TaskMutationResponse

      setTaskTitle('')
      setTaskNote('')
      setTaskDeadlineDay('')
      setTaskDeadlineTime('')
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
      void loadData({ silent: true })
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
      void loadData({ silent: true })
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
    const deadlineAt = buildDeadlineIso(replaceTaskDeadlineDay, replaceTaskDeadlineTime)

    if (!title) {
      setError('Впиши новое название задачи.')
      return
    }

    if (!deadlineAt) {
      setError('Укажи новый дедлайн задачи.')
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
          deadlineAt,
        }),
      })

      if (!response.ok) {
        throw new Error('task replace failed')
      }

      const payload = (await response.json()) as TaskMutationResponse

      closeTaskModals()
      setToast(`Задача обновлена: ${title}`)
      applyTaskUpdate(payload.task)
      void loadData({ silent: true })
    } catch {
      setError(`Ошибка обновления задачи: ${title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function buyBonusReward(rewardKey: string) {
    setBusyKey(`buy-reward-${rewardKey}`)
    setError('')

    try {
      const response = await telegramFetch('/api/bonus-shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardKey }),
      })

      if (!response.ok) {
        throw new Error('bonus purchase failed')
      }

      const payload = (await response.json()) as {
        ok: boolean
        purchase: BonusPurchase
        balanceUnits: number
      }

      setCurrentUserBonusBalanceUnits(payload.balanceUnits)
      setBonusPurchases(current => [payload.purchase, ...current])
      setToast(`Куплен бонус: ${payload.purchase.rewardTitle}`)
      void loadData({ silent: true })
    } catch {
      setError('Не удалось купить бонус. Проверь баланс и попробуй еще раз.')
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
      void loadData({ silent: true })
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
      void loadData({ silent: true })
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
      void loadData({ silent: true })
    } catch {
      setError(`Ошибка обновления покупки: ${title}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function createHousehold() {
    setBusyKey('create-household')
    setError('')
    setOnboardingStatus('')

    try {
      const response = await telegramFetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createHouseholdName.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('household create failed')
      }

      setCreateHouseholdName('')
      await loadData({ silent: true })
      setToast('Семья создана')
    } catch {
      setError('Не удалось создать семью. Попробуй еще раз.')
    } finally {
      setBusyKey(null)
    }
  }

  async function joinHousehold() {
    const code = joinHouseholdCode.trim().toUpperCase()

    if (!code) {
      setOnboardingStatus('Ошибка: введи инвайт-код семьи.')
      return
    }

    setBusyKey('join-household')
    setError('')
    setOnboardingStatus('')

    try {
      const response = await telegramFetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        if (payload?.error === 'Household is full') {
          throw new Error('Ошибка: семья уже заполнена.')
        }

        if (payload?.error === 'Already in household') {
          throw new Error('Ошибка: ты уже состоишь в семье.')
        }

        if (payload?.error === 'Invite expired') {
          throw new Error('Ошибка: срок действия инвайт-кода истек.')
        }

        if (payload?.error === 'Invite revoked') {
          throw new Error('Ошибка: этот инвайт-код больше не действует.')
        }

        if (payload?.error === 'Invite not found') {
          throw new Error('Ошибка: инвайт-код не найден.')
        }

        throw new Error(payload?.error || 'join failed')
      }

      setJoinHouseholdCode('')
      await loadData({ silent: true })
      setToast('Ты присоединился к семье')
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : ''
      setOnboardingStatus(
        message.startsWith('Ошибка:')
          ? message
          : 'Ошибка: не удалось войти по коду. Проверь код и попробуй еще раз.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function copyInviteCode() {
    const code = household?.activeInvite?.code

    if (!code) {
      setError('Сейчас нет активного инвайт-кода.')
      return
    }

    setBusyKey('copy-invite')
    setError('')

    try {
      await navigator.clipboard.writeText(code)
      setToast(`Инвайт-код скопирован: ${code}`)
    } catch {
      setError('Не удалось скопировать код. Попробуй вручную.')
    } finally {
      setBusyKey(null)
    }
  }

  async function reissueInvite() {
    setBusyKey('reissue-invite')
    setError('')

    try {
      const response = await telegramFetch('/api/household/invite', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('invite failed')
      }

      await loadData({ silent: true })
      setToast('Инвайт-код обновлен')
    } catch {
      setError('Не удалось обновить инвайт-код.')
    } finally {
      setBusyKey(null)
    }
  }

  async function createCustomInvite() {
    const code = normalizeInviteCode(customInviteCode)

    if (code.length < 6) {
      setError('Код должен быть не короче 6 символов.')
      return
    }

    setBusyKey('custom-invite')
    setError('')

    try {
      const response = await telegramFetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        if (payload?.error === 'Invite code already taken') {
          throw new Error('Этот код уже занят другой семьей.')
        }

        if (payload?.error === 'Invite code too short') {
          throw new Error('Код должен быть не короче 6 символов.')
        }

        throw new Error('custom invite failed')
      }

      await loadData({ silent: true })
      setToast(`Инвайт-код сохранен: ${code}`)
    } catch (customInviteError) {
      setError(
        customInviteError instanceof Error
          ? customInviteError.message
          : 'Не удалось сохранить свой инвайт-код.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function leaveHousehold() {
    const isLastMember = household?.members.length === 1
    const shouldLeave = window.confirm(
      isLastMember
        ? 'ВЫ ТОЧНО УВЕРЕНЫ? ДЕЙСТВИЕ БЕЗВОЗВРАТНО! Семья, задачи, покупки, рейтинг и прогресс будут удалены навсегда.'
        : household?.currentUserRole === 'head'
        ? 'Выйти из семьи? Если в семье остались люди, глава перейдет следующему участнику автоматически.'
        : 'Покинуть семью? После выхода ты потеряешь доступ к этой семье и ее данным.',
    )

    if (!shouldLeave) {
      return
    }

    setBusyKey('leave-household')
    setError('')

    try {
      const response = await telegramFetch('/api/household/leave', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('leave failed')
      }

      closeModalWithGuard()
      await loadData({ silent: true })
      setToast(isLastMember ? 'Семья удалена безвозвратно' : 'Ты покинул семью')
    } catch {
      setError('Не удалось выйти из семьи.')
    } finally {
      setBusyKey(null)
    }
  }

  async function removeHouseholdMember(memberId: string) {
    const member = household?.members.find(currentMember => currentMember.id === memberId)
    const shouldRemove = window.confirm(
      `Удалить ${member?.displayName ?? 'участника'} из семьи? Он потеряет доступ к этой семье.`,
    )

    if (!shouldRemove) {
      return
    }

    setBusyKey(`remove-member-${memberId}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/household/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('remove failed')
      }

      await loadData({ silent: true })
      setToast('Участник удален из семьи')
    } catch {
      setError('Не удалось удалить участника.')
    } finally {
      setBusyKey(null)
    }
  }

  if (appState === 'onboarding') {
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

        <HouseholdOnboarding
          actorName={getActorName(buyer)}
          createHouseholdName={createHouseholdName}
          joinCode={joinHouseholdCode}
          statusMessage={onboardingStatus}
          busyAction={
            busyKey === 'create-household'
              ? 'create'
              : busyKey === 'join-household'
                ? 'join'
                : null
          }
          onCreateHouseholdNameChange={setCreateHouseholdName}
          onJoinCodeChange={setJoinHouseholdCode}
          onCreateHousehold={() => void createHousehold()}
          onJoinHousehold={() => void joinHousehold()}
        />
      </main>
    )
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
              deadlineDay={taskDeadlineDay}
              deadlineTime={taskDeadlineTime}
              status={taskCreateStatus}
              loading={busyKey === 'create-task' || loading}
              submitLabel='Добавить задачу'
              busyLabel='Добавляю...'
              onTitleChange={setTaskTitle}
              onNoteChange={setTaskNote}
              onDeadlineDayChange={setTaskDeadlineDay}
              onDeadlineTimeChange={value => setTaskDeadlineTime(normalizeDeadlineTime(value))}
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
              deadlineDay={replaceTaskDeadlineDay}
              deadlineTime={replaceTaskDeadlineTime}
              status=''
              loading={busyKey === `replace-task-${selectedTask.id}`}
              submitLabel='Сохранить изменения'
              busyLabel='Сохраняю...'
              onTitleChange={setReplaceTaskTitle}
              onNoteChange={setReplaceTaskNote}
              onDeadlineDayChange={setReplaceTaskDeadlineDay}
              onDeadlineTimeChange={value => setReplaceTaskDeadlineTime(normalizeDeadlineTime(value))}
              onSubmit={() => void replaceTask()}
              onBack={() => setModal('task-actions')}
            />
          ) : null}

          {modal === 'task-journal' ? (
            <TaskJournalModal
              tasks={sortedCompletedTasks}
              participantCount={participantNames.length}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'last-completed-task' ? (
            <LastCompletedTaskModal
              task={sortedCompletedTasks[0] ?? null}
              participantCount={participantNames.length}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'leaderboard' ? (
            <MonthlyRatingModal
              summary={monthlyRatingSummary}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'bonus-shop' ? (
            <BonusShopModal
              balanceUnits={currentUserBonusBalanceUnits}
              purchases={bonusPurchases}
              reports={monthlyReports}
              busyRewardKey={
                busyKey?.startsWith('buy-reward-') ? busyKey.replace('buy-reward-', '') : null
              }
              onBuy={rewardKey => void buyBonusReward(rewardKey)}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'profile' ? (
            household ? (
              <HouseholdProfileModal
                actorName={getActorName(buyer)}
                profile={currentUserProfile}
                household={household}
                customInviteCode={customInviteCode}
                busyAction={busyKey}
                onCustomInviteCodeChange={value => setCustomInviteCode(normalizeInviteCode(value))}
                onCopyInvite={() => void copyInviteCode()}
                onCreateCustomInvite={() => void createCustomInvite()}
                onReissueInvite={() => void reissueInvite()}
                onLeaveHousehold={() => void leaveHousehold()}
                onRemoveMember={memberId => void removeHouseholdMember(memberId)}
                onClose={closeModalWithGuard}
              />
            ) : null
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
          leaderName={monthlyRatingSummary.leadingName}
          leaderPoints={monthlyRatingSummary.leadingPoints}
          lastCompletedAt={
            sortedCompletedTasks[0]?.completedAt
              ? formatRelativeDate(sortedCompletedTasks[0].completedAt)
              : 'Пока пусто'
          }
          balanceLabel={`${formatPoints(currentUserBonusBalanceUnits)} баллов`}
          profileLevel={currentUserProfile.currentLevel}
          profileExpToNextLevel={currentUserProfile.expToNextLevel}
          onOpenJournal={() => openMainModal('task-journal')}
          onOpenLastCompleted={() => openMainModal('last-completed-task')}
          onOpenLeaderboard={() => openMainModal('leaderboard')}
          onOpenBonusShop={() => openMainModal('bonus-shop')}
          onOpenProfile={() => openMainModal('profile')}
        />
      </div>
    </main>
  )
}
