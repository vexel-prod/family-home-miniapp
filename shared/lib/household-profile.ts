import { FAST_COMPLETION_WINDOW_MS, POINT_UNITS } from '@/shared/lib/bonus-shop'

export const PROFILE_BASE_EXP = 10
export const PROFILE_FAST_EXP_MULTIPLIER = 1.5
export const PROFILE_OVERDUE_EXP_MULTIPLIER = 1.5
export const PROFILE_LEVEL_BONUS_POINTS = 100

export type ProfileTaskExpVariant = 'base' | 'fast' | 'overdue'

export type ProfileTaskSource = {
  id: string
  title: string
  createdAt: Date | string
  completedAt: Date | string | null
  deadlineAt: Date | string
}

export type ProfileTaskExpResult = {
  expDelta: number
  variant: ProfileTaskExpVariant
}

export function getTaskExpResult(task: ProfileTaskSource): ProfileTaskExpResult {
  const createdAt = new Date(task.createdAt)
  const completedAt = task.completedAt ? new Date(task.completedAt) : null
  const deadlineAt = new Date(task.deadlineAt)

  if (!completedAt || Number.isNaN(completedAt.getTime())) {
    return {
      expDelta: 0,
      variant: 'base',
    }
  }

  if (!Number.isNaN(deadlineAt.getTime()) && completedAt.getTime() > deadlineAt.getTime()) {
    return {
      expDelta: -Math.round(PROFILE_BASE_EXP * PROFILE_OVERDUE_EXP_MULTIPLIER),
      variant: 'overdue',
    }
  }

  if (
    !Number.isNaN(createdAt.getTime()) &&
    completedAt.getTime() - createdAt.getTime() <= FAST_COMPLETION_WINDOW_MS
  ) {
    return {
      expDelta: Math.round(PROFILE_BASE_EXP * PROFILE_FAST_EXP_MULTIPLIER),
      variant: 'fast',
    }
  }

  return {
    expDelta: PROFILE_BASE_EXP,
    variant: 'base',
  }
}

export function getLevelThreshold(level: number) {
  if (level <= 0) {
    return 0
  }

  return 25 * level * (level + 3)
}

export function getCurrentLevel(totalExp: number) {
  let level = 0

  while (getLevelThreshold(level + 1) <= totalExp) {
    level += 1
  }

  return level
}

export function getLevelBonusUnits(level: number) {
  return level * PROFILE_LEVEL_BONUS_POINTS * POINT_UNITS
}
