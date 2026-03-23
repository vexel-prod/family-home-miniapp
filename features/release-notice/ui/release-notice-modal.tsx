import type { ReleaseNotice } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

type ReleaseNoticeModalProps = {
  notice: ReleaseNotice
  onClose: () => void
}

export function ReleaseNoticeModal({ notice, onClose }: ReleaseNoticeModalProps) {
  return (
    <ModalPanel className='max-w-2xl'>
      <ModalHeader>
        <div className='space-y-3'>
          <div className='text-[11px] font-bold uppercase tracking-[0.28em] text-white/44'>
            текущая версия
          </div>
          <h2 className='font-(--font-family-heading) text-2xl uppercase leading-none text-white sm:text-3xl'>
            {notice.title}
          </h2>
          <p className='max-w-xl text-sm leading-6 text-white/65 sm:text-base'>
            {notice.summary}
          </p>
        </div>
      </ModalHeader>

      <ModalBody className='space-y-4'>
        <div className='rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white/48'>
          Версия: v{notice.version}
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
      </ModalBody>

      <ModalFooter>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть окно версии
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
