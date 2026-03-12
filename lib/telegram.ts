type TelegramSendOptions = {
  chatId: string;
  text: string;
};

async function callTelegram(method: string, body: Record<string, unknown>) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Telegram request failed");
  }

  return response.json();
}

export async function sendTelegramMessage({ chatId, text }: TelegramSendOptions) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
  });
}
