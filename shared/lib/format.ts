import type { HouseholdTask, ShoppingItem } from "@/shared/types/family"

export function formatRelativeDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function sortTasks(tasks: HouseholdTask[]) {
  return [...tasks].sort((left, right) => {
    const deadlineDiff = new Date(left.deadlineAt).getTime() - new Date(right.deadlineAt).getTime()

    if (deadlineDiff !== 0) {
      return deadlineDiff
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

export function sortCompletedTasks(tasks: HouseholdTask[]) {
  return [...tasks].sort((left, right) => {
    const rightCompletedAt = right.completedAt ? new Date(right.completedAt).getTime() : 0
    const leftCompletedAt = left.completedAt ? new Date(left.completedAt).getTime() : 0

    return rightCompletedAt - leftCompletedAt
  })
}

export function sortShoppingItems(items: ShoppingItem[]) {
  return [...items].sort((left, right) => {
    const urgencyDiff = Number(right.urgency === "out") - Number(left.urgency === "out")

    if (urgencyDiff !== 0) {
      return urgencyDiff
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}
