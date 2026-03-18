import type { HouseholdTask } from '@/shared/types/family'

const MOSCOW_UTC_OFFSET_HOURS = 3
const FAST_TASK_WINDOW_MS = 30 * 60 * 1000

type MemberRating = {
  name: string
  points: number
  completedCount: number
  urgentCount: number
  fastCount: number
}

export type MonthlyRatingSummary = {
  monthLabel: string
  leaderboard: MemberRating[]
  teamBonusPoints: number
  totalTasks: number
  totalPoints: number
  leadingName: string
  leadingPoints: number
  runnerUpGap: number
  currentUser?: {
    name: string
    points: number
    place: number
    gapToLeader: number
    nextMilestone?: {
      label: string
      pointsLeft: number
    }
  }
  milestones: Array<{
    label: string
    target: number
  }>
}

const MILESTONES = [
  { target: 60, label: 'пропуск одной задачи на выбор' },
  { target: 120, label: 'пропуск прогулки с собакой' },
  { target: 180, label: '3 любых желания 😈' },
]

function getMoscowMonthStart(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = Number(parts.find(part => part.type === 'year')?.value ?? date.getUTCFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? date.getUTCMonth() + 1)

  return new Date(Date.UTC(year, month - 1, 1, -MOSCOW_UTC_OFFSET_HOURS))
}

export function isTaskInCurrentMoscowMonth(task: HouseholdTask, now = new Date()) {
  if (!task.completedAt) {
    return false
  }

  const monthStart = getMoscowMonthStart(now)
  const nextMonthStart = new Date(monthStart)
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1)

  const completedAt = new Date(task.completedAt)

  return completedAt >= monthStart && completedAt < nextMonthStart
}

function getTaskPoints(task: HouseholdTask) {
  let points = 3

  if (task.priority === 'urgent') {
    points += 3
  }

  if (task.completedAt) {
    const createdAt = new Date(task.createdAt).getTime()
    const completedAt = new Date(task.completedAt).getTime()
    const elapsedMs = completedAt - createdAt

    if (elapsedMs <= FAST_TASK_WINDOW_MS) {
      points *= 1.5
    }
  }

  return points
}

export function buildMonthlyRatingSummary(
  tasks: HouseholdTask[],
  participantNames: string[],
  currentUserName?: string,
): MonthlyRatingSummary {
  const leaderboardMap = new Map<string, MemberRating>()
  let teamBonusPoints = 0

  for (const participantName of participantNames) {
    leaderboardMap.set(participantName, {
      name: participantName,
      points: 0,
      completedCount: 0,
      urgentCount: 0,
      fastCount: 0,
    })
  }

  for (const task of tasks) {
    if (!task.completedAt || !task.completedByName) {
      continue
    }

    if (task.completedByName === 'Сделано вместе') {
      teamBonusPoints += 8
      continue
    }

    const current = leaderboardMap.get(task.completedByName) ?? {
      name: task.completedByName,
      points: 0,
      completedCount: 0,
      urgentCount: 0,
      fastCount: 0,
    }

    const taskPoints = getTaskPoints(task)
    const isFast =
      new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() <=
      FAST_TASK_WINDOW_MS

    current.points += taskPoints
    current.completedCount += 1
    current.urgentCount += task.priority === 'urgent' ? 1 : 0
    current.fastCount += isFast ? 1 : 0

    leaderboardMap.set(task.completedByName, current)
  }

  const teamBonusShare = participantNames.length > 0 ? teamBonusPoints / participantNames.length : 0

  if (teamBonusShare > 0) {
    for (const participantName of participantNames) {
      const current = leaderboardMap.get(participantName) ?? {
        name: participantName,
        points: 0,
        completedCount: 0,
        urgentCount: 0,
        fastCount: 0,
      }

      current.points += teamBonusShare
      leaderboardMap.set(participantName, current)
    }
  }

  const leaderboard = [...leaderboardMap.values()].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points
    }

    return right.completedCount - left.completedCount
  })

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    month: 'long',
  })

  const monthLabel = formatter.format(getMoscowMonthStart())
  const leader = leaderboard[0]
  const runnerUp = leaderboard[1]
  const normalizedCurrentUserName = currentUserName?.trim().toLowerCase()
  const currentUserIndex = normalizedCurrentUserName
    ? leaderboard.findIndex(
        member => member.name.trim().toLowerCase() === normalizedCurrentUserName,
      )
    : -1
  const currentUser = currentUserIndex >= 0 ? leaderboard[currentUserIndex] : undefined
  const nextMilestone = currentUser
    ? MILESTONES.find(milestone => currentUser.points < milestone.target)
    : undefined

  return {
    monthLabel: monthLabel.slice(0, 1).toUpperCase() + monthLabel.slice(1),
    leaderboard,
    teamBonusPoints,
    totalTasks: tasks.length,
    totalPoints: leaderboard.reduce((sum, member) => sum + member.points, 0),
    leadingName: leader ? `${leader.name} 🏆` : 'Пока без лидера',
    leadingPoints: leader?.points ?? 0,
    runnerUpGap: leader && runnerUp ? leader.points - runnerUp.points : leader ? leader.points : 0,
    currentUser: currentUser
      ? {
          name: currentUser.name,
          points: currentUser.points,
          place: currentUserIndex + 1,
          gapToLeader: Math.max((leader?.points ?? 0) - currentUser.points, 0),
          nextMilestone: nextMilestone
            ? {
                label: nextMilestone.label,
                pointsLeft: nextMilestone.target - currentUser.points,
              }
            : undefined,
        }
      : undefined,
    milestones: MILESTONES,
  }
}
