'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import { BonusElementCreateModal } from '@features/bonus-element/create'
import { BonusRewardFormModal } from '@features/bonus-reward/manage'
import { BonusShopModal } from '@features/bonus-shop/view'
import { FamilyGoalFormModal } from '@features/family-goal/manage'
import { HouseholdOnboarding } from '@features/household/onboarding'
import { HouseholdProfileModal } from '@features/household/profile'
import { MonthlyRatingModal } from '@features/monthly-rating/view'
import {
  ShoppingActionsModal,
  ShoppingFormModal,
  ShoppingListModal,
} from '@features/shopping-management'
import {
  LastCompletedTaskModal,
  TaskActionsModal,
  TaskFormModal,
  TaskJournalModal,
  TaskListModal,
} from '@features/task-management'
import { DashboardHero } from '@widgets/dashboard-hero'
import { JournalSummary } from '@widgets/journal-summary'
import { ModalOverlay } from '@shared/ui/app-modal'
import { NoticeToast } from '@shared/ui/notice-toast'
import { formatPoints } from '@entities/bonus'
import { buildMonthlyRatingSummary } from '@entities/monthly-rating'
import { normalizeInviteCode } from '@entities/household'
import {
  sortCompletedTasks,
  sortPurchasedShoppingItems,
  sortShoppingItems,
  sortTasks,
} from '@entities/family'
import { getActorName, getTelegramInitData, getTelegramUser } from '@entities/telegram'
import type {
  BonusReward,
  BonusPurchase,
  BootstrapResponse,
  FamilyGoal,
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
} from '@entities/family'

type TaskMutationResponse = {
  ok: boolean
  task: HouseholdTask
}

type ShoppingMutationResponse = {
  ok: boolean
  shoppingItem: ShoppingItem
}

type ApiErrorPayload = {
  error?: string
  retryAfterSeconds?: number
}

async function readApiErrorPayload(response: Response) {
  return (await response.json().catch(() => null)) as ApiErrorPayload | null
}

function formatRetryAfterLabel(retryAfterSeconds?: number) {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return 'через пару секунд'
  }

  if (retryAfterSeconds < 60) {
    return `через ${retryAfterSeconds} сек.`
  }

  return `через ${Math.ceil(retryAfterSeconds / 60)} мин.`
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallbackMessage: string) {
  if (payload?.error === 'Too many requests') {
    return `Слишком много запросов. Попробуй снова ${formatRetryAfterLabel(payload.retryAfterSeconds)}.`
  }

  return fallbackMessage
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

const FALLBACK_HOUSEHOLD_SUMMARY: HouseholdSummary = {
  id: 'preview-household',
  name: 'Household',
  members: [
    {
      id: 'preview-member',
      firstName: 'Пользователь',
      lastName: null,
      username: null,
      displayName: 'Пользователь',
      role: 'head',
      isCurrentUser: true,
      joinedAt: new Date().toISOString(),
    },
  ],
  activeInvite: {
    code: 'HOUSE777',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  currentUserMemberId: 'preview-member',
  currentUserRole: 'head',
}

type HomePageProps = {
  version: string
}

export function HomePage({ version }: HomePageProps) {
  const bootstrapRequestInFlight = useRef(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [buyer, setBuyer] = useState<TelegramUser | undefined>()
  const [telegramInitData, setTelegramInitData] = useState('')
  const [modal, setModal] = useState<ModalKey>(null)
  const [modalGuardUntil, setModalGuardUntil] = useState(0)
  const [openTasks, setOpenTasks] = useState<HouseholdTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<HouseholdTask[]>([])
  const [monthlyLeaderboardEntries, setMonthlyLeaderboardEntries] = useState<
    MonthlyLeaderboardEntry[]
  >([])
  const [monthlyTeamBonusPoints, setMonthlyTeamBonusPoints] = useState(0)
  const [participantNames, setParticipantNames] = useState<string[]>([])
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'active'>('loading')
  const [currentUserBonusBalanceUnits, setCurrentUserBonusBalanceUnits] = useState(0)
  const [household, setHousehold] = useState<HouseholdSummary | null>(null)
  const [bonusRewards, setBonusRewards] = useState<BonusReward[]>([])
  const [familyGoal, setFamilyGoal] = useState<FamilyGoal | null>(null)
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
  const [purchasedShoppingItems, setPurchasedShoppingItems] = useState<ShoppingItem[]>([])
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
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardDescription, setRewardDescription] = useState('')
  const [rewardCost, setRewardCost] = useState('')
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [goalKind, setGoalKind] = useState<'spiritual' | 'material'>('spiritual')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [goalTargetValue, setGoalTargetValue] = useState('')
  const [goalCurrentValue, setGoalCurrentValue] = useState('')
  const [goalUnitLabel, setGoalUnitLabel] = useState('')
  const [familyGoalFormBackModal, setFamilyGoalFormBackModal] = useState<'bonus-element-create' | 'profile'>('bonus-element-create')
  const [familyGoalSubmitModal, setFamilyGoalSubmitModal] = useState<'bonus-shop' | 'profile'>('bonus-shop')
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
  const sortedPurchasedShoppingItems = sortPurchasedShoppingItems(purchasedShoppingItems)
  const monthlyRatingSummary = buildMonthlyRatingSummary(
    monthlyLeaderboardEntries,
    monthlyTeamBonusPoints,
    bonusRewards,
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
    nextModal: Extract<
      ModalKey,
      | 'household'
      | 'shopping-list'
      | 'task-journal'
      | 'last-completed-task'
      | 'leaderboard'
      | 'bonus-shop'
      | 'profile'
    >,
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

  function openBonusRewardCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setEditingRewardId(null)
    setRewardTitle('')
    setRewardDescription('')
    setRewardCost('')
    setModal('bonus-reward-form')
  }

  function openBonusElementCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setModal('bonus-element-create')
  }

  function openBonusRewardEditModal(reward: BonusReward) {
    if (!canOpenModal()) {
      return
    }

    setEditingRewardId(reward.id)
    setRewardTitle(reward.title)
    setRewardDescription(reward.description ?? '')
    setRewardCost(String(Math.round(reward.costUnits / 4)))
    setModal('bonus-reward-form')
  }

  function openFamilyGoalCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setGoalKind('spiritual')
    setGoalTitle('')
    setGoalDescription('')
    setGoalTargetValue('')
    setGoalCurrentValue('')
    setGoalUnitLabel('')
    setFamilyGoalFormBackModal('bonus-element-create')
    setFamilyGoalSubmitModal('bonus-shop')
    setModal('family-goal-form')
  }

  function openFamilyGoalEditModal(returnModal: 'bonus-shop' | 'profile' = 'profile') {
    if (!canOpenModal()) {
      return
    }

    if (familyGoal) {
      setGoalKind(familyGoal.kind)
      setGoalTitle(familyGoal.title)
      setGoalDescription(familyGoal.description ?? '')
      setGoalTargetValue(String(familyGoal.targetValue))
      setGoalCurrentValue(familyGoal.kind === 'material' ? String(familyGoal.currentValue) : '')
      setGoalUnitLabel(familyGoal.kind === 'material' ? (familyGoal.unitLabel ?? '') : '')
    } else {
      setGoalKind('spiritual')
      setGoalTitle('')
      setGoalDescription('')
      setGoalTargetValue('')
      setGoalCurrentValue('')
      setGoalUnitLabel('')
    }

    setFamilyGoalFormBackModal(returnModal === 'profile' ? 'profile' : 'bonus-element-create')
    setFamilyGoalSubmitModal(returnModal)
    setModal('family-goal-form')
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
          throw new Error(
            getApiErrorMessage(
              await readApiErrorPayload(response),
              'Не получилось загрузить текущие списки. Открой приложение через Telegram и проверь доступ участника.',
            ),
          )
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
          setBonusRewards([])
          setFamilyGoal(null)
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
          setPurchasedShoppingItems([])
          setRewardTitle('')
          setRewardDescription('')
          setRewardCost('')
          setGoalKind('spiritual')
          setGoalTitle('')
          setGoalDescription('')
          setGoalTargetValue('')
          setGoalCurrentValue('')
          setGoalUnitLabel('')
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
        setBonusRewards(payload.bonusRewards)
        setFamilyGoal(payload.familyGoal)
        setCustomInviteCode(payload.household.activeInvite?.code ?? '')
        setCurrentUserProfile(payload.currentUserProfile)
        setBonusPurchases(payload.bonusPurchases)
        setMonthlyReports(payload.monthlyReports)
        setShoppingItems(payload.activeShoppingItems)
        setPurchasedShoppingItems(payload.purchasedShoppingItems)
        setGoalKind(payload.familyGoal?.kind ?? 'spiritual')
        setGoalTitle(payload.familyGoal?.title ?? '')
        setGoalDescription(payload.familyGoal?.description ?? '')
        setGoalTargetValue(payload.familyGoal ? String(payload.familyGoal.targetValue) : '')
        setGoalCurrentValue(
          payload.familyGoal?.kind === 'material' ? String(payload.familyGoal.currentValue) : '',
        )
        setGoalUnitLabel(
          payload.familyGoal?.kind === 'material' ? (payload.familyGoal.unitLabel ?? '') : '',
        )
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не получилось загрузить текущие списки. Открой приложение через Telegram и проверь доступ участника.',
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
    let reconnectDelayMs = 2000

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

      eventSource.onopen = () => {
        reconnectDelayMs = 2000
      }

      eventSource.addEventListener('household-updated', () => {
        refreshData()
      })

      eventSource.onerror = () => {
        eventSource.close()

        if (!disposed) {
          const currentDelay = reconnectDelayMs
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000)
          reconnectTimeoutId = window.setTimeout(() => {
            connectToEventStream()
          }, currentDelay)
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка добавления задачи: ${title}`,
          ),
        )
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
    } catch (taskCreateError) {
      const message =
        taskCreateError instanceof Error
          ? taskCreateError.message
          : `Ошибка добавления задачи: ${title}`
      setError(message)
      setTaskCreateStatus(
        message.startsWith('Слишком много') ? message : `Ошибка: не удалось добавить "${title}"`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка добавления покупки: ${title}`,
          ),
        )
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
    } catch (shoppingCreateError) {
      const message =
        shoppingCreateError instanceof Error
          ? shoppingCreateError.message
          : `Ошибка добавления покупки: ${title}`
      setError(message)
      setShoppingCreateStatus(
        message.startsWith('Слишком много') ? message : `Ошибка: не удалось добавить "${title}"`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            together
              ? `Ошибка: не удалось отметить как сделано вместе "${task.title}"`
              : `Ошибка закрытия задачи: ${task.title}`,
          ),
        )
      }

      const payload = (await response.json()) as TaskMutationResponse

      closeTaskModals()
      setToast(together ? `Сделано вместе: ${task.title}` : `Задача закрыта: ${task.title}`)
      applyTaskUpdate(payload.task)
      void loadData({ silent: true })
    } catch (taskUpdateError) {
      setError(
        taskUpdateError instanceof Error
          ? taskUpdateError.message
          : together
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка удаления задачи: ${task.title}`,
          ),
        )
      }

      closeTaskModals()
      setToast(`Задача удалена: ${task.title}`)
      removeTaskFromLists(task.id)
      void loadData({ silent: true })
    } catch (taskDeleteError) {
      setError(
        taskDeleteError instanceof Error
          ? taskDeleteError.message
          : `Ошибка удаления задачи: ${task.title}`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка обновления задачи: ${title}`,
          ),
        )
      }

      const payload = (await response.json()) as TaskMutationResponse

      closeTaskModals()
      setToast(`Задача обновлена: ${title}`)
      applyTaskUpdate(payload.task)
      void loadData({ silent: true })
    } catch (taskReplaceError) {
      setError(
        taskReplaceError instanceof Error
          ? taskReplaceError.message
          : `Ошибка обновления задачи: ${title}`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось купить бонус. Проверь баланс и попробуй еще раз.',
          ),
        )
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
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : 'Не удалось купить бонус. Проверь баланс и попробуй еще раз.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function createBonusReward() {
    if (!rewardTitle.trim() || !rewardCost.trim()) {
      setError('Заполни название награды и ее стоимость.')
      return
    }

    setBusyKey('create-reward')
    setError('')

    try {
      const response = await telegramFetch(
        editingRewardId ? `/api/bonus-shop/rewards/${editingRewardId}` : '/api/bonus-shop/rewards',
        {
          method: editingRewardId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: rewardTitle.trim(),
            description: rewardDescription.trim(),
            costPoints: Number(rewardCost),
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            editingRewardId
              ? 'Не удалось обновить товар в магазине.'
              : 'Не удалось добавить ништяк в магазин.',
          ),
        )
      }

      setEditingRewardId(null)
      setRewardTitle('')
      setRewardDescription('')
      setRewardCost('')
      setToast(editingRewardId ? 'Товар обновлен' : 'Ништяк добавлен в магазин')
      setModal('bonus-shop')
      await loadData({ silent: true })
    } catch (rewardError) {
      setError(
        rewardError instanceof Error
          ? rewardError.message
          : editingRewardId
            ? 'Не удалось обновить товар в магазине.'
            : 'Не удалось добавить ништяк в магазин.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteBonusReward(rewardId: string) {
    const shouldDelete = window.confirm('Удалить этот ништяк из магазина?')

    if (!shouldDelete) {
      return
    }

    setBusyKey(`delete-reward-${rewardId}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/bonus-shop/rewards/${rewardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(await readApiErrorPayload(response), 'Не удалось удалить ништяк.'),
        )
      }

      setToast('Ништяк удален из магазина')
      await loadData({ silent: true })
    } catch (rewardDeleteError) {
      setError(
        rewardDeleteError instanceof Error
          ? rewardDeleteError.message
          : 'Не удалось удалить ништяк.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function saveFamilyGoal() {
    if (!goalTitle.trim() || !goalTargetValue.trim()) {
      setError('Заполни название цели и целевое значение.')
      return
    }

    if (goalKind === 'material' && !goalUnitLabel.trim()) {
      setError('Для материальной цели укажи единицу измерения.')
      return
    }

    setBusyKey('save-family-goal')
    setError('')

    try {
      const response = await telegramFetch('/api/family-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: goalKind,
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          targetValue: Number(goalTargetValue),
          currentValue: goalKind === 'material' ? Number(goalCurrentValue || '0') : 0,
          unitLabel: goalKind === 'material' ? goalUnitLabel.trim() : null,
        }),
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось сохранить семейную цель.',
          ),
        )
      }

      setToast(familyGoal ? 'Семейная цель обновлена' : 'Семейная цель создана')
      setModal(familyGoalSubmitModal)
      await loadData({ silent: true })
    } catch (goalError) {
      setError(
        goalError instanceof Error ? goalError.message : 'Не удалось сохранить семейную цель.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function clearFamilyGoal() {
    const shouldClear = window.confirm('Убрать текущую семейную цель?')

    if (!shouldClear) {
      return
    }

    setBusyKey('clear-family-goal')
    setError('')

    try {
      const response = await telegramFetch('/api/family-goal/clear', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось убрать семейную цель.',
          ),
        )
      }

      setGoalKind('spiritual')
      setGoalTitle('')
      setGoalDescription('')
      setGoalTargetValue('')
      setGoalCurrentValue('')
      setGoalUnitLabel('')
      setToast('Семейная цель убрана')
      await loadData({ silent: true })
    } catch (goalClearError) {
      setError(
        goalClearError instanceof Error
          ? goalClearError.message
          : 'Не удалось убрать семейную цель.',
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка обновления покупки: ${item.title}`,
          ),
        )
      }

      const payload = (await response.json()) as ShoppingMutationResponse

      closeShoppingModals()
      setToast(`Покупка отмечена: ${item.title}`)
      removeShoppingItemFromList(payload.shoppingItem.id)
      setPurchasedShoppingItems(current =>
        sortPurchasedShoppingItems([payload.shoppingItem, ...current]),
      )
      void loadData({ silent: true })
    } catch (shoppingUpdateError) {
      setError(
        shoppingUpdateError instanceof Error
          ? shoppingUpdateError.message
          : `Ошибка обновления покупки: ${item.title}`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка удаления покупки: ${item.title}`,
          ),
        )
      }

      closeShoppingModals()
      setToast(`Покупка удалена: ${item.title}`)
      removeShoppingItemFromList(item.id)
      void loadData({ silent: true })
    } catch (shoppingDeleteError) {
      setError(
        shoppingDeleteError instanceof Error
          ? shoppingDeleteError.message
          : `Ошибка удаления покупки: ${item.title}`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            `Ошибка обновления покупки: ${title}`,
          ),
        )
      }

      const payload = (await response.json()) as ShoppingMutationResponse

      closeShoppingModals()
      setToast(`Покупка обновлена: ${title}`)
      upsertShoppingItem(payload.shoppingItem)
      void loadData({ silent: true })
    } catch (shoppingReplaceError) {
      setError(
        shoppingReplaceError instanceof Error
          ? shoppingReplaceError.message
          : `Ошибка обновления покупки: ${title}`,
      )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось создать семью. Попробуй еще раз.',
          ),
        )
      }

      setCreateHouseholdName('')
      await loadData({ silent: true })
      setToast('Семья создана')
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Не удалось создать семью. Попробуй еще раз.',
      )
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
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null

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

        if (payload?.error === 'Too many requests') {
          throw new Error(
            `Ошибка: слишком много попыток входа. Попробуй снова ${formatRetryAfterLabel(payload.retryAfterSeconds)}.`,
          )
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
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось обновить инвайт-код.',
          ),
        )
      }

      await loadData({ silent: true })
      setToast('Инвайт-код обновлен')
    } catch (inviteError) {
      setError(
        inviteError instanceof Error ? inviteError.message : 'Не удалось обновить инвайт-код.',
      )
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
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null

        if (payload?.error === 'Invite code already taken') {
          throw new Error('Этот код уже занят другой семьей.')
        }

        if (payload?.error === 'Invalid invite code') {
          throw new Error(
            'Код должен быть от 6 до 16 символов и содержать только латиницу и цифры.',
          )
        }

        if (payload?.error === 'Too many requests') {
          throw new Error(
            `Слишком много запросов. Попробуй снова ${formatRetryAfterLabel(payload.retryAfterSeconds)}.`,
          )
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
        throw new Error(
          getApiErrorMessage(await readApiErrorPayload(response), 'Не удалось выйти из семьи.'),
        )
      }

      closeModalWithGuard()
      await loadData({ silent: true })
      setToast(isLastMember ? 'Семья удалена безвозвратно' : 'Ты покинул семью')
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : 'Не удалось выйти из семьи.')
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
        throw new Error(
          getApiErrorMessage(await readApiErrorPayload(response), 'Не удалось удалить участника.'),
        )
      }

      await loadData({ silent: true })
      setToast('Участник удален из семьи')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Не удалось удалить участника.')
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
            busyKey === 'create-household' ? 'create' : busyKey === 'join-household' ? 'join' : null
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
    <main className='bg-(--color-page-bg) text-(--color-page-text) px-4 relative'>
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
              onDeadlineTimeChange={value =>
                setReplaceTaskDeadlineTime(normalizeDeadlineTime(value))
              }
              onSubmit={() => void replaceTask()}
              onBack={() => setModal('task-actions')}
            />
          ) : null}

          {modal === 'task-journal' ? (
            <TaskJournalModal
              tasks={sortedCompletedTasks}
              purchasedItems={sortedPurchasedShoppingItems}
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
              rewards={bonusRewards}
              purchases={bonusPurchases}
              reports={monthlyReports}
              busyRewardKey={
                busyKey?.startsWith('buy-reward-') ? busyKey.replace('buy-reward-', '') : null
              }
              onBuy={rewardKey => void buyBonusReward(rewardKey)}
              onOpenAddElement={openBonusElementCreateModal}
              onOpenEditReward={openBonusRewardEditModal}
              onDeleteReward={rewardId => void deleteBonusReward(rewardId)}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'bonus-element-create' ? (
            <BonusElementCreateModal
              onOpenRewardForm={openBonusRewardCreateModal}
              onOpenGoalForm={openFamilyGoalCreateModal}
              onBack={() => setModal('bonus-shop')}
            />
          ) : null}

          {modal === 'bonus-reward-form' ? (
            <BonusRewardFormModal
              mode={editingRewardId ? 'edit' : 'create'}
              title={rewardTitle}
              description={rewardDescription}
              cost={rewardCost}
              loading={busyKey === 'create-reward'}
              onTitleChange={setRewardTitle}
              onDescriptionChange={setRewardDescription}
              onCostChange={value => setRewardCost(value.replace(/[^\d]/g, ''))}
              onSubmit={() => void createBonusReward()}
              onBack={() => setModal('bonus-element-create')}
            />
          ) : null}

          {modal === 'family-goal-form' ? (
            <FamilyGoalFormModal
              mode={familyGoal ? 'edit' : 'create'}
              kind={goalKind}
              title={goalTitle}
              description={goalDescription}
              targetValue={goalTargetValue}
              currentValue={goalCurrentValue}
              unitLabel={goalUnitLabel}
              loading={busyKey === 'save-family-goal'}
              onKindChange={setGoalKind}
              onTitleChange={setGoalTitle}
              onDescriptionChange={setGoalDescription}
              onTargetValueChange={value => setGoalTargetValue(value.replace(/[^\d]/g, ''))}
              onCurrentValueChange={value => setGoalCurrentValue(value.replace(/[^\d]/g, ''))}
              onUnitLabelChange={setGoalUnitLabel}
              onSubmit={() => void saveFamilyGoal()}
              onBack={() => setModal(familyGoalFormBackModal)}
            />
          ) : null}

          {modal === 'profile' ? (
            <HouseholdProfileModal
              actorName={getActorName(buyer)}
              profile={currentUserProfile}
              household={household ?? FALLBACK_HOUSEHOLD_SUMMARY}
              familyGoal={familyGoal}
              customInviteCode={customInviteCode}
              busyAction={busyKey}
              onCustomInviteCodeChange={value => setCustomInviteCode(normalizeInviteCode(value))}
              onCopyInvite={() => void copyInviteCode()}
              onCreateCustomInvite={() => void createCustomInvite()}
              onReissueInvite={() => void reissueInvite()}
              onOpenEditGoal={() => openFamilyGoalEditModal('profile')}
              onLeaveHousehold={() => void leaveHousehold()}
              onClearGoal={() => void clearFamilyGoal()}
              onRemoveMember={memberId => void removeHouseholdMember(memberId)}
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

      <div className='mx-auto flex min-h-screen w-full max-w-(--page-max-width) flex-col justify-center items-center gap-4'>
        <DashboardHero actorName={getActorName(buyer)} />

        <JournalSummary
          completedTasksCount={completedTasks.length}
          leaderPoints={monthlyRatingSummary.leadingPoints}
          balanceLabel={`${formatPoints(currentUserBonusBalanceUnits)} баллов`}
          profileLevel={currentUserProfile.currentLevel}
          profileExp={currentUserProfile.expIntoCurrentLevel}
          profileExpToNextLevel={currentUserProfile.expToNextLevel}
          onOpenJournal={() => openMainModal('task-journal')}
          onOpenLeaderboard={() => openMainModal('leaderboard')}
          onOpenBonusShop={() => openMainModal('bonus-shop')}
          onOpenProfile={() => openMainModal('profile')}
          onOpenHousehold={() => openMainModal('household')}
          onOpenShopping={() => openMainModal('shopping-list')}
          openTasksCount={openTasks.length}
          shoppingItemsCount={shoppingItems.length}
        />

        <div className='text-center'>
          <div className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/45 backdrop-blur-md'>
            <span>Household</span>
            <span className='h-1 w-1 rounded-full bg-green-500/70 animate-pulse' />
            <span>v{version}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
