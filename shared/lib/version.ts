import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function getAppVersion() {
  const versionPath = join(process.cwd(), 'VERSION')
  const version = await readFile(versionPath, 'utf-8')

  return version.trim()
}
