import type { TelegramUser, TelegramWindow } from '@/shared/types/family'

function parseUserFromTelegramParams(rawParams: string) {
  const params = new URLSearchParams(rawParams)
  const rawUser = params.get('user')

  if (!rawUser) {
    return undefined
  }

  try {
    return JSON.parse(rawUser) as TelegramUser
  } catch {
    return undefined
  }
}

export function getTelegramUser() {
  const telegram = (window as TelegramWindow).Telegram?.WebApp
  const sdkUser = telegram?.initDataUnsafe?.user

  if (sdkUser) {
    return sdkUser
  }

  if (telegram?.initData) {
    const parsedUser = parseUserFromTelegramParams(telegram.initData)
    if (parsedUser) {
      return parsedUser
    }
  }

  const searchUser = parseUserFromTelegramParams(window.location.search.slice(1))
  if (searchUser) {
    return searchUser
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  return parseUserFromTelegramParams(hash)
}

export function getTelegramInitData() {
  const telegram = (window as TelegramWindow).Telegram?.WebApp
  return telegram?.initData ?? ''
}

export function getActorName(user?: TelegramUser) {
  if (!user) return 'Таинственный незнакомец'

  if (user.id === 706355445) {
    return 'Малышка 😘'
  }

  if (user.id === 5133992697) {
    return 'Vexel'
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  if (user.username) return `@${user.username}`
  if (user.id) return `id:${user.id}`
  return 'Таинственный незнакомец'
}
