const TASK_MAX_DEADLINE_DAYS = 31

export function getTaskDeadlineMaxDate(now = new Date()) {
  return new Date(now.getTime() + TASK_MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
}

export function isAllowedTaskDeadline(deadline: Date, now = new Date()) {
  if (Number.isNaN(deadline.getTime())) {
    return false
  }

  return deadline.getTime() > now.getTime() && deadline.getTime() <= getTaskDeadlineMaxDate(now).getTime()
}

export function getTaskDeadlineHelpLabel() {
  return `Дедлайн можно ставить максимум на ${TASK_MAX_DEADLINE_DAYS} день вперёд от текущего момента.`
}
