import { getPrisma } from "@/lib/prisma";
import { notifyPartner } from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type CreateShoppingPayload = {
  title?: string;
  urgency?: "soon" | "out";
  quantityLabel?: string | null;
  note?: string | null;
  addedByName?: string;
  addedByUsername?: string | null;
  addedByTelegramId?: string | null;
};

export async function POST(request: Request) {
  const prisma = getPrisma();
  const body = (await request.json()) as CreateShoppingPayload;

  if (!body.title?.trim() || !body.addedByName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing shopping item data" }, { status: 400 });
  }

  const shoppingItem = await prisma.shoppingItem.create({
    data: {
      title: body.title.trim(),
      urgency: body.urgency === "out" ? "out" : "soon",
      quantityLabel: body.quantityLabel?.trim() || null,
      note: body.note?.trim() || null,
      addedByName: body.addedByName.trim(),
      addedByUsername: body.addedByUsername ?? null,
      addedByTelegramId: body.addedByTelegramId ?? null,
    },
  });

  await notifyPartner({
    actorName: body.addedByName.trim(),
    actorTelegramId: body.addedByTelegramId ?? null,
    actorUsername: body.addedByUsername ?? null,
    text:
      `Раздел: ПОКУПКИ\n` +
      `Позиция: ${shoppingItem.title}\n` +
      `Статус: ${shoppingItem.urgency === "out" ? "закончилось" : "заканчивается"}` +
      `${shoppingItem.quantityLabel ? `\nКоличество: ${shoppingItem.quantityLabel}` : ""}` +
      `${shoppingItem.note ? `\nКомментарий: ${shoppingItem.note}` : ""}`,
  });

  return NextResponse.json({ ok: true, shoppingItem });
}
