'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

import type {
  BonusPurchase,
  BonusReward,
  BootstrapActiveResponse,
  BootstrapResponse,
  FamilyGoal,
  FetchOptions,
  HouseholdProfile,
  ReleaseNotice,
  HouseholdSummary,
  HouseholdTask,
  MonthlyLeaderboardEntry,
  ShoppingItem,
  TelegramUser,
  TelegramWindow,
} from '@entities/family'
import { getTelegramInitData, getTelegramUser } from '@entities/telegram'

const BOOTSTRAP_CACHE_KEY_PREFIX = 'family-home-miniapp:bootstrap:'

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

function createEmptyProfile(): HouseholdProfile {
  return {
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
    recentEvents: [],
  }
}

function getBootstrapCacheKey(userId: number) {
  return `${BOOTSTRAP_CACHE_KEY_PREFIX}${userId}`
}

type UseHomeBootstrapParams = {
  setError: Dispatch<SetStateAction<string>>
}

export function useHomeBootstrap({ setError }: UseHomeBootstrapParams) {
  const initializedRef = useRef(false)
  const bootstrapRequestInFlight = useRef(false)
  const queuedBootstrapRequest = useRef<{ initDataOverride?: string; silent: boolean } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const [buyer, setBuyer] = useState<TelegramUser | undefined>()
  const [telegramInitData, setTelegramInitData] = useState('')
  const [openTasks, setOpenTasks] = useState<HouseholdTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<HouseholdTask[]>([])
  const [monthlyLeaderboardEntries, setMonthlyLeaderboardEntries] = useState<
    MonthlyLeaderboardEntry[]
  >([])
  const [monthlyTeamBonusPoints, setMonthlyTeamBonusPoints] = useState(0)
  const [participantNames, setParticipantNames] = useState<string[]>([])
  const [appState, setAppState] = useState<'loading' | 'auth' | 'onboarding' | 'active'>('loading')
  const [currentUserBonusBalanceUnits, setCurrentUserBonusBalanceUnits] = useState(0)
  const [household, setHousehold] = useState<HouseholdSummary | null>(null)
  const [bonusRewards, setBonusRewards] = useState<BonusReward[]>([])
  const [familyGoal, setFamilyGoal] = useState<FamilyGoal | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<HouseholdProfile>(createEmptyProfile)
  const [bonusPurchases, setBonusPurchases] = useState<BonusPurchase[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [purchasedShoppingItems, setPurchasedShoppingItems] = useState<ShoppingItem[]>([])
  const [releaseNotice, setReleaseNotice] = useState<ReleaseNotice | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const resetActiveState = useCallback(() => {
    setOpenTasks([])
    setCompletedTasks([])
    setMonthlyLeaderboardEntries([])
    setMonthlyTeamBonusPoints(0)
    setParticipantNames([])
    setCurrentUserBonusBalanceUnits(0)
    setHousehold(null)
    setBonusRewards([])
    setFamilyGoal(null)
    setCurrentUserProfile(createEmptyProfile())
    setBonusPurchases([])
    setShoppingItems([])
    setPurchasedShoppingItems([])
    setReleaseNotice(null)
  }, [])

  const persistBootstrapCache = useCallback((payload: BootstrapActiveResponse) => {
    if (typeof window === 'undefined') {
      return
    }

    const userId = getTelegramUser()?.id

    if (!userId) {
      return
    }

    try {
      window.sessionStorage.setItem(getBootstrapCacheKey(userId), JSON.stringify(payload))
    } catch {
      // Ignore storage errors and continue with network bootstrap.
    }
  }, [])

  const clearBootstrapCache = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    const userId = getTelegramUser()?.id

    if (!userId) {
      return
    }

    try {
      window.sessionStorage.removeItem(getBootstrapCacheKey(userId))
    } catch {
      // Ignore storage errors and continue.
    }
  }, [])

  const applyBootstrapPayload = useCallback((payload: BootstrapActiveResponse) => {
    setAppState('active')
    setOpenTasks(payload.openTasks)
    setCompletedTasks(payload.completedTasks)
    setMonthlyLeaderboardEntries(payload.monthlyLeaderboardEntries)
    setMonthlyTeamBonusPoints(payload.monthlyTeamBonusPoints)
    setParticipantNames(payload.participantNames)
    setCurrentUserBonusBalanceUnits(payload.currentUserBonusBalanceUnits)
    setHousehold(payload.household)
    setBonusRewards(payload.bonusRewards)
    setFamilyGoal(payload.familyGoal)
    setCurrentUserProfile(payload.currentUserProfile)
    setBonusPurchases(payload.bonusPurchases)
    setShoppingItems(payload.activeShoppingItems)
    setPurchasedShoppingItems(payload.purchasedShoppingItems)
    setReleaseNotice(payload.releaseNotice ?? null)
  }, [])

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

  const loadData = useCallback(
    async ({
      initDataOverride,
      silent = false,
    }: {
      initDataOverride?: string
      silent?: boolean
    } = {}) => {
      if (bootstrapRequestInFlight.current) {
        const queuedRequest = queuedBootstrapRequest.current

        queuedBootstrapRequest.current = {
          initDataOverride: initDataOverride ?? queuedRequest?.initDataOverride,
          silent: queuedRequest ? queuedRequest.silent && silent : silent,
        }
        return
      }

      bootstrapRequestInFlight.current = true

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      if (!silent) {
        setError('')
      }

      try {
        const response = await telegramFetch(
          '/api/bootstrap',
          { cache: 'no-store' },
          initDataOverride,
        )

        if (!response.ok) {
          if (response.status === 401) {
            setAppState('auth')
            resetActiveState()
            clearBootstrapCache()
            throw new Error(
              'Сессия не найдена. Войди через Telegram, чтобы открыть household в браузере.',
            )
          }

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
          resetActiveState()
          setReleaseNotice(payload.releaseNotice ?? null)
          clearBootstrapCache()
          return
        }

        applyBootstrapPayload(payload)
        persistBootstrapCache(payload)
      } catch (loadError) {
        if (!silent || appState !== 'active') {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Не получилось загрузить текущие списки. Открой приложение через Telegram и проверь доступ участника.',
          )
        }
      } finally {
        bootstrapRequestInFlight.current = false

        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }

        if (queuedBootstrapRequest.current) {
          const nextRequest = queuedBootstrapRequest.current
          queuedBootstrapRequest.current = null
          void loadData(nextRequest)
        }
      }
    },
    [
      appState,
      applyBootstrapPayload,
      clearBootstrapCache,
      persistBootstrapCache,
      resetActiveState,
      setError,
      telegramFetch,
    ],
  )

  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    const telegram = (window as TelegramWindow).Telegram?.WebApp
    telegram?.ready?.()
    telegram?.expand?.()
    const user = getTelegramUser()
    setBuyer(user)
    const nextInitData = getTelegramInitData()
    setTelegramInitData(nextInitData)

    if (user?.id) {
      try {
        const cachedPayload = window.sessionStorage.getItem(getBootstrapCacheKey(user.id))

        if (cachedPayload) {
          applyBootstrapPayload(JSON.parse(cachedPayload) as BootstrapActiveResponse)
          setLoading(false)
          void loadData({ initDataOverride: nextInitData || undefined, silent: true })
          return
        }
      } catch {
        // Ignore malformed cache and continue with network bootstrap.
      }
    }

    void loadData({ initDataOverride: nextInitData || undefined })
  }, [applyBootstrapPayload, loadData])

  useEffect(() => {
    if (appState !== 'active') {
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
      const eventsUrl = telegramInitData
        ? `/api/events?initData=${encodeURIComponent(telegramInitData)}`
        : '/api/events'
      const eventSource = new EventSource(eventsUrl)

      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        reconnectDelayMs = 2000
      }

      eventSource.addEventListener('household-updated', refreshData)

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

  return {
    buyer,
    telegramInitData,
    appState,
    openTasks,
    setOpenTasks,
    completedTasks,
    setCompletedTasks,
    monthlyLeaderboardEntries,
    setMonthlyLeaderboardEntries,
    monthlyTeamBonusPoints,
    setMonthlyTeamBonusPoints,
    participantNames,
    setParticipantNames,
    currentUserBonusBalanceUnits,
    setCurrentUserBonusBalanceUnits,
    household,
    setHousehold,
    bonusRewards,
    setBonusRewards,
    familyGoal,
    setFamilyGoal,
    currentUserProfile,
    setCurrentUserProfile,
    bonusPurchases,
    setBonusPurchases,
    shoppingItems,
    setShoppingItems,
    purchasedShoppingItems,
    setPurchasedShoppingItems,
    loading,
    refreshing,
    setLoading,
    telegramFetch,
    loadData,
    releaseNotice,
    setReleaseNotice,
  }
}
