import type { PrismaClient } from '@/generated/prisma/client'
import { sendTelegramMessage } from '@shared/api/telegram'

export function getMemberDisplayName(member: {
  firstName: string
  lastName: string | null
  username: string | null
}) {
  return [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.username || member.firstName
}

export async function notifyHousehold(
  prisma: PrismaClient,
  householdId: string,
  text: string,
  excludeMemberId?: string,
) {
  const members = await prisma.member.findMany({
    where: {
      householdId,
      isActive: true,
      chatId: {
        not: null,
      },
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      chatId: true,
    },
  })

  await Promise.allSettled(
    members.map(member =>
      sendTelegramMessage({
        chatId: member.chatId ?? '',
        text,
      }),
    ),
  )
}

export async function notifyMember(
  prisma: PrismaClient,
  memberId: string,
  text: string,
  replyMarkup?: {
    inline_keyboard: Array<
      Array<
        | { text: string; callback_data: string }
        | { text: string; url: string }
      >
    >
  },
) {
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      isActive: true,
      chatId: {
        not: null,
      },
    },
    select: {
      chatId: true,
    },
  })

  if (!member?.chatId) {
    return null
  }

  return sendTelegramMessage({
    chatId: member.chatId,
    text,
    replyMarkup,
  })
}
