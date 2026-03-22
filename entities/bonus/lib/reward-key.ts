const FAMILY_REWARD_PREFIX = 'family:'
const GLOBAL_REWARD_PREFIX = 'global:'

export function isFamilyRewardKey(value: string) {
  return value.startsWith(FAMILY_REWARD_PREFIX)
}

export function toFamilyRewardKey(rewardId: string) {
  return `${FAMILY_REWARD_PREFIX}${rewardId}`
}

export function fromFamilyRewardKey(rewardKey: string) {
  return rewardKey.replace(FAMILY_REWARD_PREFIX, '')
}

export function isGlobalRewardKey(value: string) {
  return value.startsWith(GLOBAL_REWARD_PREFIX)
}

export function toGlobalRewardKey(rewardId: string) {
  return `${GLOBAL_REWARD_PREFIX}${rewardId}`
}

export function fromGlobalRewardKey(rewardKey: string) {
  return rewardKey.replace(GLOBAL_REWARD_PREFIX, '')
}

export const isHouseholdRewardKey = isFamilyRewardKey
export const toHouseholdRewardKey = toFamilyRewardKey
export const fromHouseholdRewardKey = fromFamilyRewardKey
