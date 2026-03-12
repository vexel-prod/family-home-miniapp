import { sendTelegramMessage } from "@/lib/telegram";
import { getConfiguredUserIds } from "@/lib/household";

type PartnerNotificationInput = {
  actorName: string;
  actorTelegramId?: string | null;
  actorUsername?: string | null;
  text: string;
};

function getPartnerChatId(actorTelegramId?: string | null) {
  const { primaryUserId, secondaryUserId } = getConfiguredUserIds();

  if (!primaryUserId || !secondaryUserId || !actorTelegramId) {
    return null;
  }

  if (actorTelegramId === primaryUserId) {
    return secondaryUserId;
  }

  if (actorTelegramId === secondaryUserId) {
    return primaryUserId;
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
      `${input.actorName}${actorSuffix} обновил(а) Family Plane\n\n` +
      input.text,
  });

  return { sent: true as const };
}

export function formatMoscowDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatElapsedLabel(from: Date, to: Date) {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} д`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} мин`);

  return parts.join(" ");
}
