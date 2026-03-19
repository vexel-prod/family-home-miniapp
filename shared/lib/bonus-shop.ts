export const POINT_UNITS = 4
export const FAST_COMPLETION_WINDOW_MS = 60 * 60 * 1000
export const DEADLINE_LIMIT_MS = 24 * 60 * 60 * 1000
export const DEADLINE_REMINDER_INTERVAL_MS = 3 * 60 * 1000
export const DEADLINE_PENALTY_DELAY_MS = 60 * 60 * 1000
export const BASE_TASK_UNITS = 3 * POINT_UNITS
export const FAST_TASK_MULTIPLIER = 1.5
export const OVERDUE_PENALTY_MULTIPLIER = 1.5

export const BONUS_REWARDS = [
  {
    key: 'skip-task',
    title: 'Пропуск одной задачи',
    description: 'Можно снять с себя одну бытовую задачу по согласованию.',
    costUnits: 60 * POINT_UNITS,
    accentClassName: 'from-[#f8d36b] to-[#f5b85d]',
  },
  {
    key: 'skip-dog-walk',
    title: 'Пропуск прогулки с собакой',
    description: 'Один раз в этом месяце прогулка переходит второму участнику.',
    costUnits: 120 * POINT_UNITS,
    accentClassName: 'from-[#8fd4b0] to-[#66b98f]',
  },
  {
    key: 'three-wishes',
    title: 'Три любых желания',
    description: 'Победитель месяца получает право на три бытовых желания.',
    costUnits: 180 * POINT_UNITS,
    accentClassName: 'from-[#f29fd4] to-[#dd79b9]',
  },
]

export function formatPoints(units: number) {
  const value = units / POINT_UNITS

  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/\.?0+$/, '')
}

export function getTaskAwardUnits({
  createdAt,
  completedAt,
}: {
  createdAt: Date
  completedAt: Date
}) {
  const elapsedMs = completedAt.getTime() - createdAt.getTime()
  const baseUnits = BASE_TASK_UNITS

  if (elapsedMs <= FAST_COMPLETION_WINDOW_MS) {
    return Math.round(baseUnits * FAST_TASK_MULTIPLIER)
  }

  return baseUnits
}

export function getTaskPenaltyUnits() {
  return Math.round(BASE_TASK_UNITS * OVERDUE_PENALTY_MULTIPLIER)
}

export function getDisplayedTaskRewardUnits({
  createdAt,
  completedAt,
  completedByName,
  participantCount,
}: {
  createdAt: Date
  completedAt: Date
  completedByName?: string | null
  participantCount?: number
}) {
  const awardUnits = getTaskAwardUnits({
    createdAt,
    completedAt,
  })

  if (completedByName === 'Сделано вместе' && participantCount && participantCount > 0) {
    return awardUnits / participantCount
  }

  return awardUnits
}

export function getMonthKey(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value ?? '0000'
  const month = parts.find(part => part.type === 'month')?.value ?? '00'

  return `${year}-${month}`
}

export function formatMoscowDeadlineLabel(value: string | Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
