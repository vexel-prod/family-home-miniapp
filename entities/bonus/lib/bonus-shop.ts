export const POINT_UNITS = 4
export const FAST_COMPLETION_WINDOW_MS = 60 * 60 * 1000
export const DEADLINE_LIMIT_MS = 24 * 60 * 60 * 1000
export const DEADLINE_REMINDER_INTERVAL_MS = 3 * 60 * 1000
export const DEADLINE_PENALTY_DELAY_MS = 60 * 60 * 1000
export const BASE_TASK_UNITS = 3 * POINT_UNITS
export const FAST_TASK_MULTIPLIER = 1.5
export const OVERDUE_PENALTY_MULTIPLIER = 1.5

const BONUS_REWARD_ACCENTS = [
  'from-[#f8d36b] to-[#f5b85d]',
  'from-[#8fd4b0] to-[#66b98f]',
  'from-[#f29fd4] to-[#dd79b9]',
  'from-[#7ec7f5] to-[#5ea9e1]',
  'from-[#f6a97b] to-[#ee8452]',
]

export function getBonusRewardAccentClassName(seed: string) {
  const hash = [...seed].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
  return BONUS_REWARD_ACCENTS[Math.abs(hash) % BONUS_REWARD_ACCENTS.length]
}

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
