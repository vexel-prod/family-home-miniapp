export const HOUSEHOLD_NAME_MAX_LENGTH = 48
export const TASK_TITLE_MAX_LENGTH = 120
export const TASK_NOTE_MAX_LENGTH = 600
export const SHOPPING_TITLE_MAX_LENGTH = 120
export const SHOPPING_NOTE_MAX_LENGTH = 400
export const SHOPPING_QUANTITY_MAX_LENGTH = 60
export const INVITE_CODE_MIN_LENGTH = 6
export const INVITE_CODE_MAX_LENGTH = 16
export const BONUS_REWARD_TITLE_MAX_LENGTH = 80
export const BONUS_REWARD_DESCRIPTION_MAX_LENGTH = 220
export const FAMILY_GOAL_TITLE_MAX_LENGTH = 80
export const FAMILY_GOAL_DESCRIPTION_MAX_LENGTH = 220
export const FAMILY_GOAL_UNIT_LABEL_MAX_LENGTH = 24

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function sanitizeOptionalText(value?: string | null) {
  if (!value) {
    return null
  }

  const normalized = normalizeWhitespace(value)
  return normalized || null
}

export function validateLength(value: string, maxLength: number) {
  return value.length <= maxLength
}

export function validateRequiredText(value: string | null, maxLength: number) {
  if (!value) {
    return null
  }

  const normalized = normalizeWhitespace(value)

  if (!normalized || normalized.length > maxLength) {
    return null
  }

  return normalized
}
