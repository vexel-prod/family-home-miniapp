import { HomePage } from '@pages/home'
import { getAppVersion } from '@/shared/lib/version'

export default async function Page() {
  const version = await getAppVersion()

  return <HomePage version={version} />
}
