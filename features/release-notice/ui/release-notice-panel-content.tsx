import type { ReactNode } from 'react'

import type { ReleaseNotice } from '@entities/family'
import { ModalBody, ModalFooter, ModalPanel } from '@shared/ui/app-modal'

type ReleaseNoticePanelContentProps = {
  notice: ReleaseNotice
  badgeLabel: string
  summaryPrefix?: string
  footer: ReactNode
}

export function ReleaseNoticePanelContent({
  notice,
  badgeLabel,
  summaryPrefix,
  footer,
}: ReleaseNoticePanelContentProps) {
  return (
    <ModalPanel className='max-w-2xl'>
          <div className='sticky top-0 bg-white/2 p-4 flex items-center justify-center'>VERSION {notice.version}</div>
      <ModalBody className='space-y-4'>
        <section className='rounded-[1.75rem] border-white/10 bg-(--color-surface) px-4 py-4 shadow-(--shadow-card) sm:px-5 sm:py-5'>
          <div className='space-y-3'>
            <div className='text-[11px] font-bold uppercase tracking-[0.28em] text-(--color-faint-text)'>
              {badgeLabel}
            </div>
            <h2 className='font-(--font-family-heading) text-2xl uppercase leading-none text-(--color-heading-text) sm:text-3xl'>
              {notice.title}
            </h2>
            <p className='max-w-xl text-sm leading-6 text-(--color-soft-text) sm:text-base'>
              {summaryPrefix ? `${summaryPrefix} ${notice.summary}` : notice.summary}
            </p>
          </div>
        </section>

        <div className='space-y-3'>
          {notice.highlights.map(highlight => (
            <div
              key={highlight}
              className='rounded-[1.35rem] border border-white/10 bg-(--color-surface) px-4 py-4 text-sm leading-6 text-(--color-soft-text)'
            >
              {highlight}
            </div>
          ))}
        </div>
      </ModalBody>

      <ModalFooter>{footer}</ModalFooter>
    </ModalPanel>
  )
}
