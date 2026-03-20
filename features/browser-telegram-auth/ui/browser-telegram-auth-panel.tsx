'use client'

import { SyntheticEvent, useState } from 'react'

import { AppButton } from '@shared/ui/app-button'

type BrowserTelegramAuthPanelProps = {
  loading?: boolean
  onAuthenticated: () => void | Promise<void>
}

export function BrowserTelegramAuthPanel({
  loading = false,
  onAuthenticated,
}: BrowserTelegramAuthPanelProps) {
  const [telegramUserId, setTelegramUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [, setPanelError] = useState('')

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setPanelError('')

      const response = await fetch('/api/auth/dev-telegram-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUserId,
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось выполнить dev-вход по telegramUserId.')
      }

      await onAuthenticated()
    } catch (submitError) {
      setPanelError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось выполнить dev-вход по telegramUserId.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className='h-dvh grid place-content-center p-4'>
      <form
        onSubmit={handleSubmit}
        className='rounded-md border border-white/10 bg-white/4 p-4'
      >
        <input
          value={telegramUserId}
          onChange={event => setTelegramUserId(event.target.value.replace(/[^\d]/g, ''))}
          inputMode='numeric'
          autoComplete='off'
          className='mb-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none transition focus:border-white/25'
        />
        <AppButton
          tone='home'
          type='submit'
          disabled={submitting || loading}
        >
          {submitting || loading ? 'Выполняю вход...' : 'Войти'}
        </AppButton>
      </form>
    </section>
  )
}
