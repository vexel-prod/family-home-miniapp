import type { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_HOUSEHOLD_ID = "default-household";

export async function ensureDefaultHousehold(prisma: PrismaClient) {
  const primaryChatId = process.env.TELEGRAM_PRIMARY_CHAT_ID;
  const secondaryChatId = process.env.TELEGRAM_SECONDARY_CHAT_ID;

  if (!primaryChatId || !secondaryChatId) {
    throw new Error("Missing TELEGRAM_PRIMARY_CHAT_ID or TELEGRAM_SECONDARY_CHAT_ID");
  }

  await prisma.household.upsert({
    where: { id: DEFAULT_HOUSEHOLD_ID },
    update: {},
    create: {
      id: DEFAULT_HOUSEHOLD_ID,
      name: "Family Home",
    },
  });

  await prisma.member.upsert({
    where: { telegramUserId: primaryChatId },
    update: {},
    create: {
      householdId: DEFAULT_HOUSEHOLD_ID,
      telegramUserId: primaryChatId,
      chatId: primaryChatId,
      firstName: "Primary",
    },
  });

  await prisma.member.upsert({
    where: { telegramUserId: secondaryChatId },
    update: {},
    create: {
      householdId: DEFAULT_HOUSEHOLD_ID,
      telegramUserId: secondaryChatId,
      chatId: secondaryChatId,
      firstName: "Secondary",
    },
  });
}

export { DEFAULT_HOUSEHOLD_ID };
