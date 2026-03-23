'use client'

import { useCallback, useEffect, useState } from 'react'

import { formatPoints, fromFamilyRewardKey, isFamilyRewardKey } from '@entities/bonus'
import type {
  BonusPurchase,
  BonusReward,
  HouseholdSummary,
  HouseholdTask,
  ModalKey,
  ReleaseNotice,
  ShoppingItem,
} from '@entities/family'
import {
  sortCompletedTasks,
  sortPurchasedShoppingItems,
  sortShoppingItems,
  sortTasks,
} from '@entities/family'
import { normalizeInviteCode } from '@entities/household'
import { buildMonthlyRatingSummary } from '@entities/monthly-rating'
import { getActorName } from '@entities/telegram'
import { BonusRewardFormModal } from '@features/bonus-reward/manage'
import { BonusRewardDetailsModal, BonusShopModal } from '@features/bonus-shop/view'
import { BrowserTelegramAuthPanel } from '@features/browser-telegram-auth'
import { FamilyGoalFormModal } from '@features/family-goal/manage'
import { HouseholdOnboarding } from '@features/household/onboarding'
import { HouseholdProfileModal } from '@features/household/profile'
import { MonthlyRatingModal } from '@features/monthly-rating/view'
import { ReleaseNoticeModal, ReleaseNoticeScreen } from '@features/release-notice'
import {
  ShoppingActionsModal,
  ShoppingFormModal,
  ShoppingListModal,
} from '@features/shopping-management'
import {
  TaskActionsModal,
  TaskCompletionConfirmModal,
  TaskFormModal,
  TaskJournalModal,
  TaskListModal,
} from '@features/task-management'
import {
  type ApiErrorPayload,
  buildDeadlineIso,
  formatRetryAfterLabel,
  getApiErrorMessage,
  getDefaultTaskDeadlineValue,
  getUrgentTaskSpotlight,
  normalizePointsInput,
  readApiErrorPayload,
  toDateTimeLocalValue,
} from '@pages/home/lib/home-page-helpers'
import { ModalOverlay } from '@shared/ui/app-modal'
import { NoticeToast } from '@shared/ui/notice-toast'
import { DashboardHero } from '@widgets/dashboard-hero'
import { JournalSummary } from '@widgets/journal-summary'
import { useHomeBootstrap } from '@pages/home/model/use-home-bootstrap'

type TaskMutationResponse = {
  ok: boolean
  task: HouseholdTask
  completionState?: 'completed' | 'pending-approval'
}

type ShoppingMutationResponse = {
  ok: boolean
  shoppingItem: ShoppingItem
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
  currentReleaseNotice: ReleaseNotice
}

export function HomePage({ version, currentReleaseNotice }: HomePageProps) {
  const [modal, setModal] = useState<ModalKey>(null)
  const [modalGuardUntil, setModalGuardUntil] = useState(0)
  const [selectedBonusReward, setSelectedBonusReward] = useState<BonusReward | null>(null)
  const [selectedTask, setSelectedTask] = useState<HouseholdTask | null>(null)
  const [selectedShoppingItem, setSelectedShoppingItem] = useState<ShoppingItem | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskDeadlineAt, setTaskDeadlineAt] = useState('')
  const [taskAssigneeMemberId, setTaskAssigneeMemberId] = useState('')
  const [taskRewardPoints, setTaskRewardPoints] = useState('')
  const [productTitle, setProductTitle] = useState('')
  const [productQuantity, setProductQuantity] = useState('')
  const [productNote, setProductNote] = useState('')
  const [productUrgency, setProductUrgency] = useState<'soon' | 'out' | 'without'>('soon')
  const [replaceTaskTitle, setReplaceTaskTitle] = useState('')
  const [replaceTaskNote, setReplaceTaskNote] = useState('')
  const [replaceTaskDeadlineAt, setReplaceTaskDeadlineAt] = useState('')
  const [replaceTaskAssigneeMemberId, setReplaceTaskAssigneeMemberId] = useState('')
  const [replaceTaskRewardPoints, setReplaceTaskRewardPoints] = useState('')
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
  const [familyGoalSubmitModal, setFamilyGoalSubmitModal] = useState<'bonus-shop' | 'profile'>(
    'bonus-shop',
  )
  const [onboardingStatus, setOnboardingStatus] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [taskCreateStatus, setTaskCreateStatus] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [shoppingCreateStatus, setShoppingCreateStatus] = useState('')
  const [acknowledgingReleaseNotice, setAcknowledgingReleaseNotice] = useState(false)
  const {
    buyer,
    appState,
    openTasks,
    setOpenTasks,
    completedTasks,
    setCompletedTasks,
    monthlyLeaderboardEntries,
    overallHouseholdLeaderboardEntries,
    monthlyTeamBonusPoints,
    participantNames,
    currentUserBonusBalanceUnits,
    setCurrentUserBonusBalanceUnits,
    household,
    bonusRewards,
    familyGoal,
    currentUserProfile,
    bonusPurchases,
    setBonusPurchases,
    shoppingItems,
    setShoppingItems,
    purchasedShoppingItems,
    setPurchasedShoppingItems,
    loading,
    refreshing,
    telegramFetch,
    loadData,
    releaseNotice,
    setReleaseNotice,
  } = useHomeBootstrap({ setError })

  const sortedTasks = sortTasks(openTasks)
  const sortedCompletedTasks = sortCompletedTasks(completedTasks)
  const sortedShoppingItems = sortShoppingItems(shoppingItems)
  const sortedPurchasedShoppingItems = sortPurchasedShoppingItems(purchasedShoppingItems)
  const isInitialShellLoading = loading && appState === 'loading'
  const isBrowserBootstrapGate = appState === 'loading' && !buyer && !household
  const monthlyRatingSummary = buildMonthlyRatingSummary(
    monthlyLeaderboardEntries,
    overallHouseholdLeaderboardEntries,
    monthlyTeamBonusPoints,
    bonusRewards,
    getActorName(buyer),
  )
  const currentMemberId = household?.currentUserMemberId ?? ''
  const assignableMembers = household?.members.filter(member => !member.isCurrentUser) ?? []
  const completionSelectableMembers = household?.members ?? []
  const actorName = getActorName(buyer)
  const urgentTaskSpotlight = getUrgentTaskSpotlight(openTasks)
  const isEmptyHomeState = openTasks.length === 0 && shoppingItems.length === 0
  const heroTypedText = isEmptyHomeState
      ? `Привет, ${actorName}!\nСегодня дома спокойно.\nАктивных задач и покупок пока нет.\nМожно просто выдохнуть\nили добавить что-то новое.`
      : `Привет, ${actorName}!\nДобро пожаловать в Household!\nУправляйте семейными задачами\nОтслеживайте прогресс\nЗарабатывайте house-coin (HC)\nПокупайте крутые бонусы!`

  const upsertOpenTask = useCallback((task: HouseholdTask) => {
    setOpenTasks(current => {
      const next = current.filter(currentTask => currentTask.id !== task.id)
      next.push(task)
      return sortTasks(next)
    })
  }, [setOpenTasks])

  const upsertCompletedTask = useCallback((task: HouseholdTask) => {
    setCompletedTasks(current => {
      const next = current.filter(currentTask => currentTask.id !== task.id)
      next.push(task)
      return sortCompletedTasks(next).slice(0, 30)
    })
  }, [setCompletedTasks])

  const removeTaskFromLists = useCallback((taskId: string) => {
    setOpenTasks(current => current.filter(task => task.id !== taskId))
    setCompletedTasks(current => current.filter(task => task.id !== taskId))
  }, [setCompletedTasks, setOpenTasks])

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
    [setCompletedTasks, setOpenTasks, upsertCompletedTask, upsertOpenTask],
  )

  const upsertShoppingItem = useCallback((item: ShoppingItem) => {
    setShoppingItems(current => {
      const next = current.filter(currentItem => currentItem.id !== item.id)
      next.push(item)
      return sortShoppingItems(next)
    })
  }, [setShoppingItems])

  const removeShoppingItemFromList = useCallback((itemId: string) => {
    setShoppingItems(current => current.filter(item => item.id !== itemId))
  }, [setShoppingItems])

  function canOpenModal() {
    return Date.now() >= modalGuardUntil
  }

  function closeModalWithGuard() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
  }

  const acknowledgeReleaseNotice = useCallback(async () => {
    setAcknowledgingReleaseNotice(true)
    setError('')

    try {
      const response = await telegramFetch('/api/release-notice/acknowledge', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не получилось сохранить подтверждение обновления.',
          ),
        )
      }

      setReleaseNotice(null)
    } catch (releaseNoticeError) {
      setError(
        releaseNoticeError instanceof Error
          ? releaseNoticeError.message
          : 'Не получилось сохранить подтверждение обновления.',
      )
    } finally {
      setAcknowledgingReleaseNotice(false)
    }
  }, [setError, setReleaseNotice, telegramFetch])

  function openMainModal(
    nextModal: Extract<
      ModalKey,
      | 'household'
      | 'shopping-list'
      | 'task-journal'
      | 'leaderboard'
      | 'bonus-shop'
      | 'bonus-reward-details'
      | 'profile'
    >,
  ) {
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

  function openTaskCreateModal() {
    if (!canOpenModal()) {
      return
    }

    setTaskCreateStatus('')
    setTaskTitle('')
    setTaskNote('')
    setTaskDeadlineAt(getDefaultTaskDeadlineValue())
    setTaskAssigneeMemberId('')
    setTaskRewardPoints('')
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

  function openBonusRewardDetailsModal(reward: BonusReward) {
    if (!canOpenModal()) {
      return
    }

    setSelectedBonusReward(reward)
    setModal('bonus-reward-details')
  }

  function openBonusRewardEditModal(reward: BonusReward) {
    if (!canOpenModal()) {
      return
    }

    setEditingRewardId(isFamilyRewardKey(reward.id) ? fromFamilyRewardKey(reward.id) : reward.id)
    setRewardTitle(reward.title)
    setRewardDescription(reward.description ?? '')
    setRewardCost(String(Math.round(reward.costUnits / 4)))
    setModal('bonus-reward-form')
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

    setFamilyGoalSubmitModal(returnModal)
    setModal('family-goal-form')
  }

  function openTaskReplaceModal() {
    if (!selectedTask) {
      return
    }

    setReplaceTaskTitle(selectedTask.title)
    setReplaceTaskNote(selectedTask.note ?? '')
    setReplaceTaskDeadlineAt(toDateTimeLocalValue(selectedTask.deadlineAt))
    setReplaceTaskAssigneeMemberId(selectedTask.assignedMemberId ?? '')
    setReplaceTaskRewardPoints(
      selectedTask.rewardUnits ? formatPoints(selectedTask.rewardUnits) : '',
    )
    setModal('task-replace')
  }

  function closeTaskModals() {
    setModalGuardUntil(Date.now() + 300)
    setModal(null)
    setSelectedTask(null)
    setReplaceTaskTitle('')
    setReplaceTaskNote('')
    setReplaceTaskDeadlineAt('')
    setReplaceTaskAssigneeMemberId('')
    setReplaceTaskRewardPoints('')
    setTaskDeadlineAt('')
    setTaskAssigneeMemberId('')
    setTaskRewardPoints('')
    setTaskTitle('')
    setTaskNote('')
    setTaskCreateStatus('')
  }

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

  useEffect(() => {
    if (appState === 'onboarding') {
      setRewardTitle('')
      setRewardDescription('')
      setRewardCost('')
      setGoalKind('spiritual')
      setGoalTitle('')
      setGoalDescription('')
      setGoalTargetValue('')
      setGoalCurrentValue('')
      setGoalUnitLabel('')
      setCustomInviteCode('')
      setModal(null)
      return
    }

    if (appState !== 'active') {
      return
    }

    setOnboardingStatus('')
    setCustomInviteCode(household?.activeInvite?.code ?? '')
    setGoalKind(familyGoal?.kind ?? 'spiritual')
    setGoalTitle(familyGoal?.title ?? '')
    setGoalDescription(familyGoal?.description ?? '')
    setGoalTargetValue(familyGoal ? String(familyGoal.targetValue) : '')
    setGoalCurrentValue(familyGoal?.kind === 'material' ? String(familyGoal.currentValue) : '')
    setGoalUnitLabel(familyGoal?.kind === 'material' ? (familyGoal.unitLabel ?? '') : '')
  }, [appState, familyGoal, household])

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
    const deadlineAt = buildDeadlineIso(taskDeadlineAt)

    if (!title) {
      setError('Впиши, какое действие нужно сделать по дому.')
      setTaskCreateStatus('Ошибка: впиши задачу.')
      return
    }

    if (!deadlineAt) {
      setError('Укажи дедлайн задачи в пределах текущего месяца.')
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
          assignedMemberId: taskAssigneeMemberId || null,
          rewardPoints: taskRewardPoints ? Number(taskRewardPoints) : null,
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
      setTaskDeadlineAt('')
      setTaskAssigneeMemberId('')
      setTaskRewardPoints('')
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
    return completeTaskForMember(task, together ? null : undefined, together)
  }

  async function completeTaskForMember(
    task: HouseholdTask,
    creditedMemberId?: string | null,
    together = false,
  ) {
    setBusyKey(`${together ? 'task-together' : 'task'}-${task.id}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: together ? 'complete-together' : 'complete',
          creditedMemberId,
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
      setToast(
        payload.completionState === 'pending-approval'
          ? `Отправили на подтверждение: ${task.title}`
          : together
            ? `Сделано вместе: ${task.title}`
            : `Задача закрыта: ${task.title}`,
      )
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

  function requestTaskCompletion(task: HouseholdTask) {
    if (task.status === 'pending-approval') {
      setError('Эта задача уже ожидает подтверждения автора.')
      return
    }

    if (!task.assignedMemberId) {
      void completeTask(task)
      return
    }

    if (task.assignedMemberId === currentMemberId) {
      void completeTaskForMember(task, task.assignedMemberId)
      return
    }

    setSelectedTask(task)
    setModal('task-complete-confirm')
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
    const deadlineAt = buildDeadlineIso(replaceTaskDeadlineAt)

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
          assignedMemberId: replaceTaskAssigneeMemberId || null,
          rewardPoints: replaceTaskRewardPoints ? Number(replaceTaskRewardPoints) : null,
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
      setSelectedBonusReward(current =>
        current?.id === payload.purchase.rewardKey ? current : current,
      )
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
              : 'Не удалось добавить товар в магазин.',
          ),
        )
      }

      setEditingRewardId(null)
      setRewardTitle('')
      setRewardDescription('')
      setRewardCost('')
      setToast(editingRewardId ? 'Товар обновлен' : 'Товар добавлен в магазин')
      setSelectedBonusReward(null)
      setModal('bonus-shop')
      await loadData({ silent: true })
    } catch (rewardError) {
      setError(
        rewardError instanceof Error
          ? rewardError.message
          : editingRewardId
            ? 'Не удалось обновить товар в магазине.'
            : 'Не удалось добавить товар в магазин.',
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteBonusReward(rewardId: string) {
    const resolvedRewardId = isFamilyRewardKey(rewardId) ? fromFamilyRewardKey(rewardId) : rewardId
    const shouldDelete = window.confirm('Удалить этот товар из магазина?')

    if (!shouldDelete) {
      return
    }

    setBusyKey(`delete-reward-${rewardId}`)
    setError('')

    try {
      const response = await telegramFetch(`/api/bonus-shop/rewards/${resolvedRewardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(await readApiErrorPayload(response), 'Не удалось удалить товар.'),
        )
      }

      setToast('Товар удален из магазина')
      setSelectedBonusReward(null)
      await loadData({ silent: true })
    } catch (rewardDeleteError) {
      setError(
        rewardDeleteError instanceof Error
          ? rewardDeleteError.message
          : 'Не удалось удалить товар.',
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
    const householdName = createHouseholdName.trim()

    if (!householdName) {
      setError('Название семьи обязательно')
      setOnboardingStatus('')
      return
    }

    setBusyKey('create-household')
    setError('')
    setOnboardingStatus('')

    try {
      const response = await telegramFetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: householdName,
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

  async function sendMonthlyReport() {
    setBusyKey('send-monthly-report')
    setError('')

    try {
      const response = await telegramFetch('/api/household/monthly-report', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await readApiErrorPayload(response),
            'Не удалось отправить отчет за текущий месяц.',
          ),
        )
      }

      setToast('Отчет за текущий месяц отправлен в Telegram')
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : 'Не удалось отправить отчет за текущий месяц.',
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

  if (appState === 'auth') {
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
        </div>

        <BrowserTelegramAuthPanel
          loading={loading}
          onAuthenticated={async () => {
            window.location.reload()
          }}
        />
      </main>
    )
  }

  if (isBrowserBootstrapGate) {
    return (
      <main className='min-h-screen bg-(--color-page-bg) text-(--color-page-text)'>
        <section className='mx-auto flex min-h-screen w-full max-w-xl items-center px-4 sm:px-6'>
          <div className='w-full rounded-md border border-white/10 bg-white/6 p-6 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-7'>
            <div className='text-xs uppercase tracking-[0.28em] text-white/45'>Household</div>
            <h1 className='mt-4 font-(--font-family-heading) text-3xl leading-none text-white sm:text-4xl'>
              Проверяю доступ
            </h1>
            <p className='mt-4 text-sm leading-6 text-white/68 sm:text-base'>
              Подготавливаю вход через Telegram и проверяю доступ к семье.
            </p>
            <div className='mt-5 h-2 overflow-hidden rounded-full bg-white/8'>
              <div className='h-full w-1/3 animate-pulse rounded-full bg-white/55' />
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (releaseNotice && !isBrowserBootstrapGate) {
    return (
      <ReleaseNoticeScreen
        actorName={actorName}
        notice={releaseNotice}
        loading={acknowledgingReleaseNotice}
        onAcknowledge={() => void acknowledgeReleaseNotice()}
      />
    )
  }

  return (
    <main
      aria-busy={isInitialShellLoading || refreshing}
      className='relative min-h-dvh flex flex-col justify-between items-center bg-(--color-page-bg) text-(--color-page-text) px-4'
    >
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
              loading={isInitialShellLoading}
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
              deadlineAt={taskDeadlineAt}
              assigneeMemberId={taskAssigneeMemberId}
              rewardPoints={taskRewardPoints}
              status={taskCreateStatus}
              loading={busyKey === 'create-task' || loading}
              submitLabel='Добавить задачу'
              busyLabel='Добавляю...'
              members={assignableMembers}
              onTitleChange={setTaskTitle}
              onNoteChange={setTaskNote}
              onDeadlineAtChange={setTaskDeadlineAt}
              onAssigneeMemberIdChange={setTaskAssigneeMemberId}
              onRewardPointsChange={value => setTaskRewardPoints(normalizePointsInput(value))}
              onSubmit={() => void addTask()}
              onBack={() => setModal('household')}
            />
          ) : null}

          {modal === 'task-actions' && selectedTask ? (
            <TaskActionsModal
              task={selectedTask}
              busyKey={busyKey}
              onClose={() => setModal('household')}
              onComplete={() => requestTaskCompletion(selectedTask)}
              onCompleteTogether={() => void completeTask(selectedTask, true)}
              onReplace={openTaskReplaceModal}
              onDelete={() => void deleteTask(selectedTask)}
            />
          ) : null}

          {(modal === 'task-complete-confirm' || modal === 'task-complete-select') &&
          selectedTask ? (
            <TaskCompletionConfirmModal
              mode={modal === 'task-complete-confirm' ? 'confirm' : 'select'}
              taskTitle={selectedTask.title}
              assigneeName={selectedTask.assignedMemberName ?? 'адресат'}
              loading={busyKey === `task-${selectedTask.id}`}
              members={completionSelectableMembers}
              onConfirmAssignee={() =>
                void completeTaskForMember(selectedTask, selectedTask.assignedMemberId ?? null)
              }
              onSelectMember={memberId => {
                void completeTaskForMember(selectedTask, memberId)
              }}
              onBack={() =>
                setModal(
                  modal === 'task-complete-confirm' ? 'task-complete-select' : 'task-actions',
                )
              }
            />
          ) : null}

          {modal === 'task-replace' && selectedTask ? (
            <TaskFormModal
              mode='replace'
              title={replaceTaskTitle}
              note={replaceTaskNote}
              deadlineAt={replaceTaskDeadlineAt}
              assigneeMemberId={replaceTaskAssigneeMemberId}
              rewardPoints={replaceTaskRewardPoints}
              status=''
              loading={busyKey === `replace-task-${selectedTask.id}`}
              submitLabel='Сохранить изменения'
              busyLabel='Сохраняю...'
              members={assignableMembers}
              onTitleChange={setReplaceTaskTitle}
              onNoteChange={setReplaceTaskNote}
              onDeadlineAtChange={setReplaceTaskDeadlineAt}
              onAssigneeMemberIdChange={setReplaceTaskAssigneeMemberId}
              onRewardPointsChange={value =>
                setReplaceTaskRewardPoints(normalizePointsInput(value))
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

          {modal === 'leaderboard' ? (
            <MonthlyRatingModal
              summary={monthlyRatingSummary}
              loading={isInitialShellLoading}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'release-notice' ? (
            <ReleaseNoticeModal
              notice={currentReleaseNotice}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'bonus-shop' ? (
            <BonusShopModal
              balanceUnits={currentUserBonusBalanceUnits}
              rewards={bonusRewards}
              purchases={bonusPurchases}
              loading={isInitialShellLoading}
              onOpenReward={openBonusRewardDetailsModal}
              onOpenAddElement={openBonusRewardCreateModal}
              onClose={closeModalWithGuard}
            />
          ) : null}

          {modal === 'bonus-reward-details' && selectedBonusReward ? (
            <BonusRewardDetailsModal
              reward={selectedBonusReward}
              balanceUnits={currentUserBonusBalanceUnits}
              busyRewardKey={
                busyKey?.startsWith('buy-reward-') ? busyKey.replace('buy-reward-', '') : null
              }
              onBuy={rewardKey => void buyBonusReward(rewardKey)}
              onEdit={reward => {
                setSelectedBonusReward(null)
                openBonusRewardEditModal(reward)
              }}
              onDelete={rewardId => void deleteBonusReward(rewardId)}
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
              onBack={() => setModal('bonus-shop')}
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
              onBack={() => setModal('profile')}
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
              loading={isInitialShellLoading}
              onCustomInviteCodeChange={value => setCustomInviteCode(normalizeInviteCode(value))}
              onCopyInvite={() => void copyInviteCode()}
              onCreateCustomInvite={() => void createCustomInvite()}
              onReissueInvite={() => void reissueInvite()}
              onSendMonthlyReport={() => void sendMonthlyReport()}
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
              loading={isInitialShellLoading}
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
              onClose={() => setModal('shopping-list')}
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

      <div className='mx-auto flex min-h-screen w-full max-w-(--page-max-width) flex-col items-center justify-center gap-4'>
        <DashboardHero
          actorName={actorName}
          typedText={heroTypedText}
          urgentSummary={urgentTaskSpotlight}
        />

        <JournalSummary
          loading={isInitialShellLoading}
          completedTasksCount={completedTasks.length}
          leaderPoints={monthlyRatingSummary.leadingPoints}
          balanceLabel={`${formatPoints(currentUserBonusBalanceUnits)} HC`}
          profileLevel={currentUserProfile.currentLevel}
          profileTotalExp={currentUserProfile.totalExp}
          onOpenJournal={() => (appState === 'active' ? openMainModal('task-journal') : undefined)}
          onOpenLeaderboard={() =>
            appState === 'active' ? openMainModal('leaderboard') : undefined
          }
          onOpenBonusShop={() => (appState === 'active' ? openMainModal('bonus-shop') : undefined)}
          onOpenProfile={() => (appState === 'active' ? openMainModal('profile') : undefined)}
          onOpenHousehold={() => (appState === 'active' ? openMainModal('household') : undefined)}
          onOpenShopping={() =>
            appState === 'active' ? openMainModal('shopping-list') : undefined
          }
          openTasksCount={openTasks.length}
          shoppingItemsCount={shoppingItems.length}
        />
      </div>

      <div className='absolute bottom-0 mb-4 flex justify-center px-4'>
        <button
          type='button'
          onClick={() => setModal('release-notice')}
          className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/45 backdrop-blur-md transition hover:bg-white/10 hover:text-white/72'
        >
          <span>Household</span>
          <span
            className={`h-1 w-1 rounded-full ${
              refreshing ? 'animate-pulse bg-amber-400/80' : 'animate-pulse bg-green-500/70'
            }`}
          />
          <span>v{version}</span>
        </button>
      </div>
    </main>
  )
}
