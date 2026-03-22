'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AppButton } from '@shared/ui/app-button'

type BrowserTelegramAuthPanelProps = {
  loading?: boolean
  onAuthenticated: () => void | Promise<void>
}

type BrowserLoginConfigResponse =
  | { ok: true; botUsername: string }
  | { ok: false; error?: string }

type BrowserLoginStartResponse =
  | {
      ok: true
      sessionId: string
      token: string
      loginUrl: string
      fallbackUrl: string
      expiresAt: string
      delivery: 'start-link'
      requiresStart: true
    }
  | {
      ok: false
      error?: string
    }

type BrowserLoginStatusResponse =
  | { ok: true; status: 'pending' | 'expired' | 'approved' }
  | { ok: false; error?: string }

const POLL_INTERVAL_MS = 1800
const LOGIN_SESSION_STORAGE_KEY = 'browser-telegram-login-session'

type StoredBrowserLoginSession = {
  sessionId: string
  token: string
  loginUrl: string
  fallbackUrl: string
  expiresAt: string
}

export function BrowserTelegramAuthPanel({
  loading = false,
  onAuthenticated,
}: BrowserTelegramAuthPanelProps) {
  const authTabRef = useRef<Window | null>(null)
  const [botUsername, setBotUsername] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'approved' | 'expired'>('idle')
  const [sessionId, setSessionId] = useState('')
  const [token, setToken] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [startCommand, setStartCommand] = useState('')
  const [commandCopied, setCommandCopied] = useState(false)
  const [panelError, setPanelError] = useState('')

  const persistSession = useCallback((payload: StoredBrowserLoginSession) => {
    try {
      window.sessionStorage.setItem(LOGIN_SESSION_STORAGE_KEY, JSON.stringify(payload))
    } catch {}
  }, [])

  const clearPersistedSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(LOGIN_SESSION_STORAGE_KEY)
    } catch {}
  }, [])

  const closeAuthTab = useCallback(() => {
    try {
      authTabRef.current?.close()
    } catch {}

    authTabRef.current = null
  }, [])

  const pollBrowserLogin = useCallback(
    async (nextSessionId: string, nextToken: string) => {
      const response = await fetch(
        `/api/auth/browser-login/${encodeURIComponent(nextSessionId)}?token=${encodeURIComponent(nextToken)}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        throw new Error('Не удалось проверить подтверждение входа.')
      }

      const payload = (await response.json()) as BrowserLoginStatusResponse

      if (!payload.ok) {
        throw new Error(payload.error || 'Не удалось проверить подтверждение входа.')
      }

      if (payload.status === 'approved') {
        clearPersistedSession()
        closeAuthTab()
        setStatus('approved')
        await onAuthenticated()
        return
      }

      if (payload.status === 'expired') {
        clearPersistedSession()
        closeAuthTab()
        setStatus('expired')
        setPanelError('Сессия входа истекла. Запусти вход заново.')
      }
    },
    [clearPersistedSession, closeAuthTab, onAuthenticated],
  )

  useEffect(() => {
    let cancelled = false
    let pollTimerId: number | null = null

    async function loadConfig() {
      try {
        const response = await fetch('/api/auth/browser-login', {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Не удалось подготовить вход через Telegram-бота.')
        }

        const payload = (await response.json()) as BrowserLoginConfigResponse

        if (!payload.ok || !payload.botUsername) {
          throw new Error(
            payload.ok ? 'Не удалось подготовить вход через Telegram-бота.' : payload.error || 'Не удалось подготовить вход через Telegram-бота.',
          )
        }

        if (!cancelled) {
          setBotUsername(payload.botUsername)

          try {
            const rawStoredSession = window.sessionStorage.getItem(LOGIN_SESSION_STORAGE_KEY)

            if (!rawStoredSession) {
              return
            }

            const storedSession = JSON.parse(rawStoredSession) as StoredBrowserLoginSession

            if (
              !storedSession.sessionId ||
              !storedSession.token ||
              !storedSession.loginUrl ||
              !storedSession.fallbackUrl ||
              !storedSession.expiresAt
            ) {
              clearPersistedSession()
              return
            }

            if (new Date(storedSession.expiresAt).getTime() <= Date.now()) {
              clearPersistedSession()
              return
            }

            setSessionId(storedSession.sessionId)
            setToken(storedSession.token)
            setTelegramUrl(storedSession.loginUrl)
            setFallbackUrl(storedSession.fallbackUrl)
            setStartCommand(`login_${storedSession.token}`)
            setCommandCopied(false)
            setStatus('waiting')
          } catch {
            clearPersistedSession()
          }
        }
      } catch (configError) {
        if (!cancelled) {
          setPanelError(
            configError instanceof Error
              ? configError.message
              : 'Не удалось подготовить вход через Telegram-бота.',
          )
        }
      }
    }

    if (status === 'waiting' && sessionId && token) {
      pollTimerId = window.setInterval(() => {
        void pollBrowserLogin(sessionId, token)
      }, POLL_INTERVAL_MS)
    }

    void loadConfig()

    return () => {
      cancelled = true

      if (pollTimerId !== null) {
        window.clearInterval(pollTimerId)
      }
    }
  }, [clearPersistedSession, pollBrowserLogin, sessionId, status, token])

  const startLogin = useCallback(async () => {
    try {
      setSubmitting(true)
      setPanelError('')
      setStatus('idle')
      setCommandCopied(false)
      closeAuthTab()
      clearPersistedSession()

      const response = await fetch('/api/auth/browser-login', {
        method: 'POST',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Не удалось создать сессию входа.')
      }

      const payload = (await response.json()) as BrowserLoginStartResponse

      if (!payload.ok) {
        throw new Error(payload.error || 'Не удалось создать сессию входа.')
      }

      setSessionId(payload.sessionId)
      setToken(payload.token)
      setTelegramUrl(payload.loginUrl)
      setFallbackUrl(payload.fallbackUrl)
      setStartCommand(`login_${payload.token}`)
      setStatus('waiting')
      persistSession({
        sessionId: payload.sessionId,
        token: payload.token,
        loginUrl: payload.loginUrl,
        fallbackUrl: payload.fallbackUrl,
        expiresAt: payload.expiresAt,
      })

      try {
        await navigator.clipboard.writeText(`/start login_${payload.token}`)
        setCommandCopied(true)
      } catch {
        setCommandCopied(false)
      }

      authTabRef.current = window.open(payload.loginUrl, '_blank')
      void pollBrowserLogin(payload.sessionId, payload.token)
    } catch (startError) {
      setPanelError(
        startError instanceof Error ? startError.message : 'Не удалось создать сессию входа.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [clearPersistedSession, closeAuthTab, persistSession, pollBrowserLogin])

  const isBusy = submitting || loading

  async function copyStartCommand() {
    if (!startCommand) {
      return
    }

    try {
      await navigator.clipboard.writeText(`/start ${startCommand}`)
      setCommandCopied(true)
    } catch {
      setPanelError('Не удалось скопировать команду. Отправь её вручную из блока ниже.')
    }
  }

  return (
    <section className='min-h-dvh grid place-content-center p-4'>
      <div className='w-full max-w-md rounded-md border border-white/10 bg-white/6 p-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'>
        <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Browser Access</div>
        <h1 className='mt-3 text-2xl font-(--font-family-heading) uppercase leading-tight text-white'>
          Вход через Telegram-бота
        </h1>
        

        <div className='mt-4'>
          <AppButton
            tone='home'
            className='w-full'
            type='button'
            disabled={isBusy}
            onClick={() => void startLogin()}
          >
            {isBusy ? 'Готовлю вход...' : 'Открыть авторизацию Telegram'}
          </AppButton>
        </div>

        {status === 'waiting' && telegramUrl && fallbackUrl ? (
          <div className='mt-4 flex flex-col gap-3'>
            <div className='rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/70'>
              Жду подтверждение из бота в общей DB. Если auth-tab закрылся или ты хочешь пройти
              шаг заново, открой его ещё раз.
            </div>
            <a
              href={telegramUrl}
              target='_blank'
              rel='noreferrer'
              className='rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-center text-sm text-white transition hover:bg-white/12'
            >
              Открыть auth-tab ещё раз
            </a>
            <a
              href={fallbackUrl}
              className='rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-white/80 transition hover:bg-black/28'
            >
              Открыть установленный Telegram
            </a>
            {startCommand ? (
              <div className='rounded-2xl border border-white/10 bg-black/20 p-4 text-left'>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Fallback</div>
                <div className='mt-3 text-sm text-white/70'>
                  Отправь в `@{botUsername || 'FamilyPlaneBot'}` вот эту команду:
                </div>
                <div className='mt-3 break-all rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-sm text-white'>
                  /start {startCommand}
                </div>
                <AppButton
                  tone='secondary'
                  type='button'
                  className='mt-3 w-full'
                  onClick={() => void copyStartCommand()}
                >
                  {commandCopied ? 'Fallback скопирован' : 'Скопировать fallback-команду'}
                </AppButton>
              </div>
            ) : null}
          </div>
        ) : null}

        {panelError ? (
          <div className='mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100'>
            {panelError}
          </div>
        ) : null}

        {status === 'approved' ? (
          <div className='mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100'>
            Вход подтвержден. Загружаю household...
          </div>
        ) : null}

        {status !== 'idle' && sessionId ? (
          <div className='mt-4 text-center text-xs text-white/35'>
            session: {sessionId.slice(0, 8)}...
          </div>
        ) : null}
      </div>
    </section>
  )
}
