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
  priority: "normal" | "urgent"
  addedByName: string
  createdAt: string
  completedAt?: string | null
  completedByName?: string | null
}

export type ShoppingItem = {
  id: string
  title: string
  urgency: "soon" | "out"
  quantityLabel: string | null
  note: string | null
  addedByName: string
  createdAt: string
}

export type BootstrapResponse = {
  ok: boolean
  openTasks: HouseholdTask[]
  completedTasks: HouseholdTask[]
  activeShoppingItems: ShoppingItem[]
}

export type ModalKey =
  | "household"
  | "task-create"
  | "task-actions"
  | "task-replace"
  | "task-journal"
  | "shopping-list"
  | "shopping-create"
  | "shopping-actions"
  | "shopping-replace"
  | null
