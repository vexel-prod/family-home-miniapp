import type { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_HOUSEHOLD_ID = "default-household";

function getConfiguredUserIds() {
  const primaryUserId =
    process.env.TELEGRAM_PRIMARY_USER_ID ?? process.env.TELEGRAM_PRIMARY_CHAT_ID;
  const secondaryUserId =
    process.env.TELEGRAM_SECONDARY_USER_ID ?? process.env.TELEGRAM_SECONDARY_CHAT_ID;

  return { primaryUserId, secondaryUserId };
}

export async function ensureDefaultHousehold(prisma: PrismaClient) {
  const { primaryUserId, secondaryUserId } = getConfiguredUserIds();

  if (!primaryUserId || !secondaryUserId) {
    throw new Error(
      "Missing TELEGRAM_PRIMARY_USER_ID/TELEGRAM_PRIMARY_CHAT_ID or TELEGRAM_SECONDARY_USER_ID/TELEGRAM_SECONDARY_CHAT_ID",
    );
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
    where: { telegramUserId: primaryUserId },
    update: {},
    create: {
      householdId: DEFAULT_HOUSEHOLD_ID,
      telegramUserId: primaryUserId,
      chatId: primaryUserId,
      firstName: "Primary",
    },
  });

  await prisma.member.upsert({
    where: { telegramUserId: secondaryUserId },
    update: {},
    create: {
      householdId: DEFAULT_HOUSEHOLD_ID,
      telegramUserId: secondaryUserId,
      chatId: secondaryUserId,
      firstName: "Secondary",
    },
  });
}

export { DEFAULT_HOUSEHOLD_ID, getConfiguredUserIds };
