'use client'

import type { ReleaseNotice } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ModalOverlay } from '@shared/ui/app-modal'
import { ReleaseNoticePanelContent } from './release-notice-panel-content'

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
    <ModalOverlay>
      <ReleaseNoticePanelContent
        notice={notice}
        badgeLabel='обновление приложения'
        summaryPrefix={`Привет, ${actorName}.`}
        footer={
          <AppButton
            type='button'
            tone='home'
            disabled={loading}
            onClick={onAcknowledge}
            className='justify-center rounded-[1.35rem] py-4 text-base font-black uppercase tracking-[0.04em]'
          >
            {loading ? 'Сохраняю...' : 'Ознакомлен'}
          </AppButton>
        }
      />
    </ModalOverlay>
  )
}
