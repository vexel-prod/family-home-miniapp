import { HomePage } from '@pages/home'
import { getReleaseNoticeContent } from '@/shared/lib/release-notice'
import { getAppVersion } from '@/shared/lib/version'

export default async function Page() {
  const version = await getAppVersion()
  const currentReleaseNotice = await getReleaseNoticeContent(version)

  return (
    <HomePage
      version={version}
      currentReleaseNotice={currentReleaseNotice}
    />
  )
}
