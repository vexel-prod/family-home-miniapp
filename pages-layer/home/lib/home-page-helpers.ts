import type { HouseholdTask } from '@entities/family'
import { getTaskDeadlineMaxDate } from '@shared/lib/task-deadline'

export type ApiErrorPayload = {
  error?: string
  retryAfterSeconds?: number
}

export async function readApiErrorPayload(response: Response) {
  return (await response.json().catch(() => null)) as ApiErrorPayload | null
}

export function formatRetryAfterLabel(retryAfterSeconds?: number) {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return 'через пару секунд'
  }

  if (retryAfterSeconds < 60) {
    return `через ${retryAfterSeconds} сек.`
  }

  return `через ${Math.ceil(retryAfterSeconds / 60)} мин.`
}

export function getApiErrorMessage(payload: ApiErrorPayload | null, fallbackMessage: string) {
  if (payload?.error === 'Too many requests') {
    return `Слишком много запросов. Попробуй снова ${formatRetryAfterLabel(payload.retryAfterSeconds)}.`
  }

  return fallbackMessage
}

export function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

export function getDefaultTaskDeadlineValue() {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 2)

  const maxLimit = getTaskDeadlineMaxDate(now)

  if (next.getTime() > maxLimit.getTime()) {
    return toDateTimeLocalValue(maxLimit)
  }

  return toDateTimeLocalValue(next)
}

export function getUrgentTaskSpotlight(tasks: HouseholdTask[]) {
  const now = Date.now()
  const sortedTasks = [...tasks]
    .map(task => ({
      task,
      diffMs: new Date(task.deadlineAt).getTime() - now,
    }))
    .filter(entry => !Number.isNaN(entry.diffMs))
    .sort((left, right) => left.diffMs - right.diffMs)

  const urgentTasks = sortedTasks.filter(entry => entry.diffMs <= 3 * 60 * 60 * 1000)

  if (urgentTasks.length === 0) {
    return null
  }

  const overdueCount = urgentTasks.filter(entry => entry.diffMs <= 0).length
  const thirtyMinutesCount = urgentTasks.filter(
    entry => entry.diffMs > 0 && entry.diffMs <= 30 * 60 * 1000,
  ).length
  const oneHourCount = urgentTasks.filter(
    entry => entry.diffMs > 30 * 60 * 1000 && entry.diffMs <= 60 * 60 * 1000,
  ).length
  const threeHoursCount = urgentTasks.filter(
    entry => entry.diffMs > 60 * 60 * 1000 && entry.diffMs <= 3 * 60 * 60 * 1000,
  ).length

  const buckets: Array<{
    label: string
    count: number
    tone: 'danger' | 'warning' | 'soon'
  }> = []

  if (overdueCount > 0) {
    buckets.push({ label: 'Просрочено', count: overdueCount, tone: 'danger' })
  }

  if (thirtyMinutesCount > 0) {
    buckets.push({ label: '< 30 мин', count: thirtyMinutesCount, tone: 'danger' })
  }

  if (oneHourCount > 0) {
    buckets.push({ label: '< 1 час', count: oneHourCount, tone: 'warning' })
  }

  if (threeHoursCount > 0) {
    buckets.push({ label: '< 3 часа', count: threeHoursCount, tone: 'soon' })
  }

  return {
    totalCount: urgentTasks.length,
    buckets,
  }
}

export function buildDeadlineIso(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

export function normalizePointsInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}
