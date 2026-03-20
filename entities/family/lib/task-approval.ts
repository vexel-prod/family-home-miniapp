import { createHmac, timingSafeEqual } from 'node:crypto'

export type TaskApprovalDecision = 'approved' | 'rejected'

function getApprovalSecret() {
  const secret = process.env.APPROVAL_SECRET ?? process.env.TELEGRAM_BOT_TOKEN

  if (!secret) {
    throw new Error('Missing APPROVAL_SECRET or TELEGRAM_BOT_TOKEN')
  }

  return secret
}

export function createTaskApprovalToken(approvalId: string, decision: TaskApprovalDecision) {
  return createHmac('sha256', getApprovalSecret()).update(`${approvalId}:${decision}`).digest('hex')
}

export function verifyTaskApprovalToken(
  approvalId: string,
  decision: TaskApprovalDecision,
  token: string,
) {
  const expected = createTaskApprovalToken(approvalId, decision)
  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer)
}
