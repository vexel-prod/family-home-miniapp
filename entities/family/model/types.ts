export type TelegramUser = {
  first_name?: string
  last_name?: string
  username?: string
  id?: number
}

export type TelegramWebApp = {
  ready?: () => void
  expand?: () => void
  initData?: string
  initDataUnsafe?: {
    user?: TelegramUser
  }
}

export type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}

export type FetchOptions = RequestInit & {
  headers?: HeadersInit
}

export type HouseholdTask = {
  id: string
  title: string
  note: string | null
  status: 'open' | 'pending-approval' | 'done'
  assignedMemberId?: string | null
  assignedMemberName?: string | null
  rewardUnits?: number | null
  priority: "normal" | "urgent"
  addedByName: string
  createdAt: string
  deadlineAt: string
  completedAt?: string | null
  completedByName?: string | null
  lastDeadlineReminderAt?: string | null
  penaltyAppliedAt?: string | null
  penaltyAppliedUnits?: number
}

export type BonusPurchase = {
  id: string
  rewardKey: string
  rewardTitle: string
  costUnits: number
  createdAt: string
}

export type BonusReward = {
  id: string
  title: string
  description: string | null
  costUnits: number
  createdByMemberId: string
}

export type FamilyGoal = {
  id: string
  kind: "spiritual" | "material"
  title: string
  description: string | null
  targetValue: number
  currentValue: number
  unitLabel: string | null
  isCompleted: boolean
}

export type HouseholdMember = {
  id: string
  firstName: string
  lastName: string | null
  username: string | null
  displayName: string
  role: "head" | "member"
  isCurrentUser: boolean
  joinedAt: string
}

export type HouseholdInvite = {
  code: string
  expiresAt: string
}

export type HouseholdSummary = {
  id: string
  name: string
  members: HouseholdMember[]
  activeInvite: HouseholdInvite | null
  currentUserMemberId: string
  currentUserRole: "head" | "member"
}

export type HouseholdProfileEvent = {
  id: string
  title: string
  completedAt: string
  expDelta: number
  variant: "base" | "fast" | "overdue"
}

export type HouseholdProfile = {
  totalExp: number
  currentLevel: number
  bonusBalanceUnits: number
  currentLevelThreshold: number
  nextLevel: number
  nextLevelThreshold: number
  expIntoCurrentLevel: number
  expToNextLevel: number
  completedTasksCount: number
  fastTasksCount: number
  overdueTasksCount: number
  recentEvents: HouseholdProfileEvent[]
}

export type MonthlyLeaderboardEntry = {
  name: string
  points: number
  completedCount: number
  fastCount: number
}

export type ShoppingItem = {
  id: string
  title: string
  status: "active" | "purchased"
  urgency: "soon" | "out" | "without"
  quantityLabel: string | null
  note: string | null
  addedByName: string
  purchasedAt?: string | null
  purchasedByName?: string | null
  createdAt: string
}

export type BootstrapActiveResponse = {
  ok: boolean
  state: "active"
  openTasks: HouseholdTask[]
  completedTasks: HouseholdTask[]
  monthlyCompletedTasks: HouseholdTask[]
  monthlyLeaderboardEntries: MonthlyLeaderboardEntry[]
  monthlyTeamBonusPoints: number
  participantNames: string[]
  currentUserBonusBalanceUnits: number
  currentUserProfile: HouseholdProfile
  household: HouseholdSummary
  bonusRewards: BonusReward[]
  familyGoal: FamilyGoal | null
  bonusPurchases: BonusPurchase[]
  activeShoppingItems: ShoppingItem[]
  purchasedShoppingItems: ShoppingItem[]
}

export type BootstrapOnboardingResponse = {
  ok: boolean
  state: "onboarding"
}

export type BootstrapResponse = BootstrapActiveResponse | BootstrapOnboardingResponse

export type ModalKey =
  | "household"
  | "task-create"
  | "task-actions"
  | "task-complete-confirm"
  | "task-complete-select"
  | "task-replace"
  | "task-journal"
  | "leaderboard"
  | "bonus-shop"
  | "bonus-reward-form"
  | "family-goal-form"
  | "profile"
  | "shopping-list"
  | "shopping-create"
  | "shopping-actions"
  | "shopping-replace"
  | null
