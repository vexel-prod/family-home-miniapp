import type { ReleaseNotice } from '@entities/family'
import { AppButton } from '@shared/ui/app-button'
import { ReleaseNoticePanelContent } from './release-notice-panel-content'

type ReleaseNoticeModalProps = {
  notice: ReleaseNotice
  onClose: () => void
}

export function ReleaseNoticeModal({ notice, onClose }: ReleaseNoticeModalProps) {
  return (
    <ReleaseNoticePanelContent
      notice={notice}
      badgeLabel='текущая версия'
      footer={
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть окно версии
        </AppButton>
      }
    />
  )
}
