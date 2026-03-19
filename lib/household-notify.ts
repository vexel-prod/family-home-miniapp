import type { PrismaClient } from '@/generated/prisma/client'
import { sendTelegramMessage } from '@/lib/telegram'

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
