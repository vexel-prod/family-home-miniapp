'use client'

import type { ReleaseNotice } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'

type ReleaseNoticeScreenProps = {
  actorName: string
  notice: ReleaseNotice
  loading?: boolean
  onAcknowledge: () => void
}

export function ReleaseNoticeScreen({
  actorName,
  notice,
  loading = false,
  onAcknowledge,
}: ReleaseNoticeScreenProps) {
  return (
    <main className='min-h-screen bg-(--color-page-bg) px-4 py-6 text-(--color-page-text)'>
      <section className='mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-2xl items-center'>
        <div className='w-full overflow-hidden rounded-4xl border border-white/10 bg-white/6 shadow-(--shadow-panel) backdrop-blur-xl'>
          <div className='relative overflow-hidden border-b border-white/10 bg-linear-to-br from-[#c98f3f] via-[#efd18e] to-[#fff4d6] px-6 py-7 text-[#25190d] sm:px-8 sm:py-9'>
            <div className='pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/25 to-transparent' />
            <div className='pointer-events-none absolute -right-10 top-4 h-28 w-28 rounded-full bg-white/30 blur-3xl' />
            <div className='text-[11px] font-bold uppercase tracking-[0.28em] text-black/50'>
              обновление приложения
            </div>
            <h1 className='mt-4 font-(--font-family-heading) text-3xl leading-none sm:text-4xl'>
              {notice.title}
            </h1>
            <p className='mt-4 max-w-xl text-sm leading-6 text-black/68 sm:text-base'>
              Привет, {actorName}. {notice.summary}
            </p>
          </div>

          <div className='space-y-5 px-6 py-6 sm:px-8 sm:py-8'>
            <div className='rounded-3xl border border-white/10 bg-black/12 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white/48'>
              Текущая версия: v{notice.version}
            </div>

            <div className='space-y-3'>
              {notice.highlights.map(highlight => (
                <div
                  key={highlight}
                  className='rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/78'
                >
                  {highlight}
                </div>
              ))}
            </div>

            <AppButton
              type='button'
              tone='home'
              disabled={loading}
              onClick={onAcknowledge}
              className='w-full justify-center rounded-3xl py-4 text-base font-black uppercase tracking-[0.04em]'
            >
              {loading ? 'Сохраняю...' : 'Ознакомлен'}
            </AppButton>
          </div>
        </div>
      </section>
    </main>
  )
}
