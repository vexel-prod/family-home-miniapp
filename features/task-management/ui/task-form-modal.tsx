'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'
import { getTaskDeadlineHelpLabel, getTaskDeadlineMaxDate } from '@shared/lib/task-deadline'
import { StatusMessage } from '@shared/ui/status-message'

const calendarWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const timeWheelHours = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'))
const timeWheelMinutes = Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0'))
const timeWheelItemHeight = 42
const timeWheelViewportHeight = 158
const timeWheelSpacerHeight = (timeWheelViewportHeight - timeWheelItemHeight) / 2

type TaskFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  note: string
  deadlineAt: string
  assigneeMemberId: string
  rewardPoints: string
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  members: Array<{
    id: string
    displayName: string
  }>
  onTitleChange: (value: string) => void
  onNoteChange: (value: string) => void
  onDeadlineAtChange: (value: string) => void
  onAssigneeMemberIdChange: (value: string) => void
  onRewardPointsChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

function parseDateTimeLocal(value: string) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCurrentMonthCursor() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function getNextMonthCursor(monthCursor: Date, offset: number) {
  return new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1)
}

function getCalendarDays(monthCursor: Date) {
  const startOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const endOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
  const startOffset = (startOfMonth.getDay() + 6) % 7
  const days: Array<{ date: Date; currentMonth: boolean }> = []

  for (let index = startOffset; index > 0; index -= 1) {
    const date = new Date(startOfMonth)
    date.setDate(startOfMonth.getDate() - index)
    days.push({ date, currentMonth: false })
  }

  for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
    days.push({
      date: new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day),
      currentMonth: true,
    })
  }

  while (days.length % 7 !== 0) {
    const date = new Date(endOfMonth)
    date.setDate(endOfMonth.getDate() + (days.length % 7) + 1)
    days.push({ date, currentMonth: false })
  }

  return days
}

function toIsoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDeadlineLabel(value: string) {
  const date = parseDateTimeLocal(value)

  if (!date) {
    return 'Выбери дату и время дедлайна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDatePart(value: string) {
  return value.slice(0, 10)
}

function getTimePart(value: string) {
  return value.slice(11, 16)
}

function mergeDeadlineValue(datePart: string, timePart: string) {
  if (!datePart) {
    return ''
  }

  return `${datePart}T${timePart || '12:00'}`
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type TimeWheelColumnProps = {
  options: string[]
  selectedValue: string
  onSelect: (value: string) => void
}

function TimeWheelColumn({ options, selectedValue, onSelect }: TimeWheelColumnProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const selectedIndex = Math.max(options.indexOf(selectedValue), 0)
    const targetTop = selectedIndex * timeWheelItemHeight

    if (Math.abs(container.scrollTop - targetTop) < 2) {
      return
    }

    container.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    })
  }, [options, selectedValue])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const snapToClosestValue = () => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const nextIndex = clampValue(
      Math.round(container.scrollTop / timeWheelItemHeight),
      0,
      options.length - 1,
    )
    const nextValue = options[nextIndex]

    if (nextValue !== selectedValue) {
      onSelect(nextValue)
    }

    container.scrollTo({
      top: nextIndex * timeWheelItemHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div
      ref={containerRef}
      onScroll={() => {
        if (scrollTimeoutRef.current !== null) {
          window.clearTimeout(scrollTimeoutRef.current)
        }

        scrollTimeoutRef.current = window.setTimeout(snapToClosestValue, 90)
      }}
      className='snap-y snap-mandatory overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
      style={{ height: `${timeWheelViewportHeight}px` }}
    >
      <div style={{ height: `${timeWheelSpacerHeight}px` }} />

      {options.map(option => {
        const isSelected = option === selectedValue

        return (
          <button
            key={option}
            type='button'
            onClick={() => onSelect(option)}
            className={`flex w-full snap-center items-center justify-center rounded-xl text-center font-light tabular-nums tracking-[0.02em] transition ${
              isSelected ? 'text-white' : 'text-white/24 hover:text-white/50'
            }`}
            style={{ height: `${timeWheelItemHeight}px`, fontSize: isSelected ? '1.4rem' : '1.2rem' }}
          >
            {option}
          </button>
        )
      })}

      <div style={{ height: `${timeWheelSpacerHeight}px` }} />
    </div>
  )
}

function TimeWheelPicker({
  selectedHour,
  selectedMinute,
  onHourSelect,
  onMinuteSelect,
}: {
  selectedHour: string
  selectedMinute: string
  onHourSelect: (value: string) => void
  onMinuteSelect: (value: string) => void
}) {
  return (
    <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-white/3 px-3 py-2'>
      <div className='pointer-events-none absolute inset-x-3 top-1/2 z-20 h-10.5 -translate-y-1/2 rounded-[1.15rem] bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-linear-to-b from-[#120f1f] via-[#120f1f]/86 to-transparent' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-[#120f1f] via-[#120f1f]/86 to-transparent' />

      <div className='relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1'>
        <TimeWheelColumn
          options={timeWheelHours}
          selectedValue={selectedHour}
          onSelect={onHourSelect}
        />

        <div className='pb-1 text-center text-[2rem] font-semibold text-white/22'>:</div>

        <TimeWheelColumn
          options={timeWheelMinutes}
          selectedValue={selectedMinute}
          onSelect={onMinuteSelect}
        />
      </div>
    </div>
  )
}

export function TaskFormModal({
  mode,
  title,
  note,
  deadlineAt,
  assigneeMemberId,
  rewardPoints,
  status,
  loading,
  submitLabel,
  busyLabel,
  members,
  onTitleChange,
  onNoteChange,
  onDeadlineAtChange,
  onAssigneeMemberIdChange,
  onRewardPointsChange,
  onSubmit,
  onBack,
}: TaskFormModalProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [monthCursor, setMonthCursor] = useState(getCurrentMonthCursor)
  const calendarDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor])
  const selectedDate = getDatePart(deadlineAt)
  const selectedTime = getTimePart(deadlineAt) || '12:00'
  const [selectedHour = '12', selectedMinute = '00'] = selectedTime.split(':')
  const minSelectableDate = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])
  const maxSelectableDate = useMemo(() => {
    const maxDate = getTaskDeadlineMaxDate(new Date())
    maxDate.setHours(23, 59, 59, 999)
    return maxDate
  }, [])
  const minMonthCursor = useMemo(
    () => new Date(minSelectableDate.getFullYear(), minSelectableDate.getMonth(), 1),
    [minSelectableDate],
  )
  const maxMonthCursor = useMemo(
    () => new Date(maxSelectableDate.getFullYear(), maxSelectableDate.getMonth(), 1),
    [maxSelectableDate],
  )
  const fallbackDate = selectedDate || toIsoDate(new Date())

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая задача' : 'Редактирование задачи'}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: разобрать сушилку' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='space-y-3'>
            <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Сделать до</div>

            <button
              type='button'
              onClick={() => setIsCalendarOpen(current => !current)}
              className='flex w-full items-center justify-between rounded-[1.75rem] border border-white/10 bg-(--color-panel-field) px-6 py-5 text-left transition hover:border-white/20'
            >
              <div>
                <div className='text-lg font-medium text-white'>
                  {formatDeadlineLabel(deadlineAt)}
                </div>
              </div>
              <div className='text-sm text-white/45'>
                {isCalendarOpen ? 'Свернуть' : 'Изменить'}
              </div>
            </button>

            {isCalendarOpen ? (
              <div className='rounded-[1.75rem] border border-white/10 bg-[#120f1f]/95 p-4 shadow-2xl backdrop-blur-xl'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <button
                    type='button'
                    onClick={() => setMonthCursor(current => getNextMonthCursor(current, -1))}
                    disabled={monthCursor.getTime() <= minMonthCursor.getTime()}
                    className='rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/70 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30'
                  >
                    Назад
                  </button>

                  <div className='text-center text-sm font-semibold uppercase tracking-[0.24em] text-white/70'>
                    {formatMonthLabel(monthCursor)}
                  </div>

                  <button
                    type='button'
                    onClick={() => setMonthCursor(current => getNextMonthCursor(current, 1))}
                    disabled={monthCursor.getTime() >= maxMonthCursor.getTime()}
                    className='rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/70 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30'
                  >
                    Вперёд
                  </button>
                </div>

                <div className='grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-white/35'>
                  {calendarWeekdays.map(day => (
                    <div
                      key={day}
                      className='py-2'
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className='grid grid-cols-7 gap-2'>
                  {calendarDays.map(({ date, currentMonth: isCurrentMonth }) => {
                    const iso = toIsoDate(date)
                    const selected = iso === selectedDate
                    const disabled =
                      !isCurrentMonth ||
                      date.getTime() < minSelectableDate.getTime() ||
                      date.getTime() > maxSelectableDate.getTime()

                    return (
                      <button
                        key={iso}
                        type='button'
                        disabled={disabled}
                        onClick={() => onDeadlineAtChange(mergeDeadlineValue(iso, selectedTime))}
                        className={`aspect-square rounded-2xl text-sm font-semibold transition ${
                          selected
                            ? 'bg-(--color-brand-home) text-(--color-page-text) shadow-lg shadow-yellow-500/20'
                            : disabled
                              ? 'bg-transparent text-white/20'
                              : 'bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>

                <div className='mt-4 space-y-3'>
                  <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Время</div>

                  <TimeWheelPicker
                    selectedHour={selectedHour}
                    selectedMinute={selectedMinute}
                    onHourSelect={hour =>
                      onDeadlineAtChange(mergeDeadlineValue(fallbackDate, `${hour}:${selectedMinute}`))
                    }
                    onMinuteSelect={minute =>
                      onDeadlineAtChange(
                        mergeDeadlineValue(fallbackDate, `${selectedHour}:${minute}`),
                      )
                    }
                  />

                  <div className='text-center text-sm text-white/45'>
                    Выбрано: <span className='font-semibold tabular-nums text-white'>{selectedTime}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className='text-xs leading-5 text-white/45'>
              {getTaskDeadlineHelpLabel()}
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Адресат</div>
              <select
                value={assigneeMemberId}
                onChange={event => onAssigneeMemberIdChange(event.target.value)}
                className='w-full rounded-xl border border-white/10 bg-(--color-panel-field) px-4 py-4 text-base text-(--color-panel-text) outline-none transition-colors duration-150 hover:border-white/20 focus:border-white/30'
              >
                <option value=''>Без адресата</option>
                {members.map(member => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.displayName}
                  </option>
                ))}
              </select>
              <div className='text-xs leading-5 text-white/40'>Себе задачу адресовать нельзя.</div>
            </label>

            <label className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Награда, HC</div>
              <TextInput
                type='text'
                inputMode='numeric'
                placeholder='По умолчанию'
                value={rewardPoints}
                onChange={event => onRewardPointsChange(event.target.value)}
              />
            </label>
          </div>

          <TextAreaField
            placeholder={mode === 'create' ? 'Комментарий или детали' : 'Комментарий'}
            value={note}
            onChange={event => onNoteChange(event.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
          <AppButton
            tone={mode === 'create' ? 'home' : 'success'}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? busyLabel : submitLabel}
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onBack}
          >
            Назад
          </AppButton>
        </div>
      </ModalFooter>
    </ModalPanel>
  )
}
