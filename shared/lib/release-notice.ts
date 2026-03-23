import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const RELEASE_NOTICE_BASELINE_VERSION = '2.7.1'

export type ReleaseNotice = {
  version: string
  title: string
  summary: string
  highlights: string[]
}

const RELEASE_NOTICE_FILE_NAME = 'RELEASE_NOTICE.md'

function normalizeVersionPart(part: string | undefined) {
  const parsed = Number.parseInt(part ?? '0', 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function compareVersions(left: string, right: string) {
  const leftParts = left.split('.')
  const rightParts = right.split('.')
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = normalizeVersionPart(leftParts[index])
    const rightPart = normalizeVersionPart(rightParts[index])

    if (leftPart > rightPart) {
      return 1
    }

    if (leftPart < rightPart) {
      return -1
    }
  }

  return 0
}

export function shouldShowReleaseNotice(currentVersion: string, acknowledgedVersion?: string | null) {
  if (compareVersions(currentVersion, RELEASE_NOTICE_BASELINE_VERSION) <= 0) {
    return false
  }

  return acknowledgedVersion !== currentVersion
}

type ReleaseNoticeSections = {
  title: string
  summary: string
  highlights: string[]
}

function parseReleaseNoticeSections(rawContent: string): ReleaseNoticeSections {
  const lines = rawContent.split(/\r?\n/)
  const titleLine = lines.find(line => line.trimStart().startsWith('Title:'))

  let currentSection: 'summary' | 'highlights' | null = null
  const summaryLines: string[] = []
  const highlights: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('Title:')) {
      currentSection = null
      continue
    }

    if (trimmedLine === 'Summary:') {
      currentSection = 'summary'
      continue
    }

    if (trimmedLine === 'Highlights:') {
      currentSection = 'highlights'
      continue
    }

    if (!trimmedLine) {
      if (currentSection === 'summary' && summaryLines.length > 0) {
        summaryLines.push('')
      }

      continue
    }

    if (currentSection === 'summary') {
      summaryLines.push(trimmedLine)
      continue
    }

    if (currentSection === 'highlights' && trimmedLine.startsWith('- ')) {
      highlights.push(trimmedLine.slice(2).trim())
    }
  }

  const title = titleLine?.split('Title:')[1]?.trim() ?? ''
  const summary = summaryLines.join('\n').replace(/\n{2,}/g, '\n\n').trim()

  if (!title || !summary || highlights.length === 0) {
    throw new Error(
      'Invalid RELEASE_NOTICE.md format. Expected Title:, Summary:, and Highlights: sections.',
    )
  }

  return {
    title,
    summary,
    highlights,
  }
}

async function readReleaseNoticeTemplate() {
  const releaseNoticePath = join(process.cwd(), RELEASE_NOTICE_FILE_NAME)
  return readFile(releaseNoticePath, 'utf-8')
}

export async function getReleaseNoticeContent(version: string): Promise<ReleaseNotice> {
  const rawTemplate = await readReleaseNoticeTemplate()
  const parsedContent = parseReleaseNoticeSections(rawTemplate)

  return {
    version,
    title: parsedContent.title.replaceAll('{version}', version),
    summary: parsedContent.summary.replaceAll('{version}', version),
    highlights: parsedContent.highlights.map(highlight => highlight.replaceAll('{version}', version)),
  }
}
