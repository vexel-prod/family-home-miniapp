import { sendTelegramMessage } from "@/lib/telegram";

type PartnerNotificationInput = {
  actorName: string;
  actorTelegramId?: string | null;
  actorUsername?: string | null;
  text: string;
};

function getPartnerChatId(actorTelegramId?: string | null) {
  const firstChatId = process.env.TELEGRAM_PRIMARY_CHAT_ID;
  const secondChatId = process.env.TELEGRAM_SECONDARY_CHAT_ID;

  if (!firstChatId || !secondChatId || !actorTelegramId) {
    return null;
  }

  if (actorTelegramId === firstChatId) {
    return secondChatId;
  }

  if (actorTelegramId === secondChatId) {
    return firstChatId;
  }

  return null;
}

export async function notifyPartner(input: PartnerNotificationInput) {
  const partnerChatId = getPartnerChatId(input.actorTelegramId);

  if (!partnerChatId) {
    return { sent: false as const, reason: "partner-not-configured" };
  }

  const actorSuffix = input.actorUsername ? ` (@${input.actorUsername})` : "";
  await sendTelegramMessage({
    chatId: partnerChatId,
    text:
      `${input.actorName}${actorSuffix} добавил(а) новое обновление в Family Plane\n\n` +
      input.text,
  });

  return { sent: true as const };
}
