'use client'

import { useMemo, useState } from 'react'

import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'
import { StatusMessage } from '@shared/ui/status-message'

const calendarWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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

function normalizeTimeValue(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
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
  const [monthCursor] = useState(getCurrentMonthCursor)
  const calendarDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor])
  const selectedDate = getDatePart(deadlineAt)
  const selectedTime = getTimePart(deadlineAt) || '12:00'
  const currentMonth = new Date()

  return (
    <ModalPanel>
      <ModalHeader>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
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
                <div className='text-lg font-medium text-white'>{formatDeadlineLabel(deadlineAt)}</div>
              </div>
              <div className='text-sm text-white/45'>{isCalendarOpen ? 'Свернуть' : 'Изменить'}</div>
            </button>

            {isCalendarOpen ? (
              <div className='rounded-[1.75rem] border border-white/10 bg-[#120f1f]/95 p-4 shadow-2xl backdrop-blur-xl'>
                <div className='mb-4 text-center text-sm font-semibold uppercase tracking-[0.24em] text-white/70'>
                  {formatMonthLabel(monthCursor)}
                </div>

                <div className='grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-white/35'>
                  {calendarWeekdays.map(day => (
                    <div key={day} className='py-2'>
                      {day}
                    </div>
                  ))}
                </div>

                <div className='grid grid-cols-7 gap-2'>
                  {calendarDays.map(({ date, currentMonth: isCurrentMonth }) => {
                    const iso = toIsoDate(date)
                    const selected = iso === selectedDate
                    const isPastDay = iso < toIsoDate(new Date())
                    const disabled =
                      !isCurrentMonth ||
                      isPastDay ||
                      date.getMonth() !== currentMonth.getMonth() ||
                      date.getFullYear() !== currentMonth.getFullYear()

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

                <div className='mt-4 space-y-2'>
                  <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Время</div>
                  <TextInput
                    type='text'
                    inputMode='numeric'
                    placeholder='12:00'
                    maxLength={5}
                    value={selectedTime}
                    onChange={event =>
                      onDeadlineAtChange(
                        mergeDeadlineValue(
                          selectedDate || toIsoDate(new Date()),
                          normalizeTimeValue(event.target.value),
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className='text-xs leading-5 text-white/45'>
              Дедлайн можно ставить только в пределах текущего месяца.
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
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <div className='text-xs leading-5 text-white/40'>
                Себе задачу адресовать нельзя.
              </div>
            </label>

            <label className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-white/45'>
                Награда, HC
              </div>
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
          <AppButton tone={mode === 'create' ? 'home' : 'success'} onClick={onSubmit} disabled={loading}>
            {loading ? busyLabel : submitLabel}
          </AppButton>

          <AppButton tone='secondary' onClick={onBack}>
            Назад
          </AppButton>
        </div>
      </ModalFooter>
    </ModalPanel>
  )
}
