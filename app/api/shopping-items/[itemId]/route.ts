import { getPrisma } from "@/lib/prisma";
import { notifyPartner } from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type UpdateShoppingPayload = {
  action?: "purchase" | "restore" | "replace";
  actorName?: string;
  actorUsername?: string | null;
  actorTelegramId?: string | null;
  title?: string;
  urgency?: "soon" | "out";
  quantityLabel?: string | null;
  note?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const prisma = getPrisma();
  const { itemId } = await context.params;
  const body = (await request.json()) as UpdateShoppingPayload;

  if (!body.action || !body.actorName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing update data" }, { status: 400 });
  }

  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    return NextResponse.json({ ok: false, error: "Shopping item not found" }, { status: 404 });
  }

  if (body.action === "replace") {
    if (!body.title?.trim()) {
      return NextResponse.json({ ok: false, error: "Missing replacement title" }, { status: 400 });
    }

    const updatedItem = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        title: body.title.trim(),
        urgency: body.urgency === "out" ? "out" : "soon",
        quantityLabel: body.quantityLabel?.trim() || null,
        note: body.note?.trim() || null,
      },
    });

    await notifyPartner({
      actorName: body.actorName.trim(),
      actorTelegramId: body.actorTelegramId ?? null,
      actorUsername: body.actorUsername ?? null,
      text:
        `Раздел: ПОКУПКИ\n` +
        `Позиция обновлена: ${updatedItem.title}\n` +
        `Статус: ${updatedItem.urgency === "out" ? "закончилось" : "заканчивается"}` +
        `${updatedItem.quantityLabel ? `\nКоличество: ${updatedItem.quantityLabel}` : ""}` +
        `${updatedItem.note ? `\nКомментарий: ${updatedItem.note}` : ""}`,
    });

    return NextResponse.json({ ok: true, shoppingItem: updatedItem });
  }

  const updatedItem = await prisma.shoppingItem.update({
    where: { id: itemId },
    data:
      body.action === "purchase"
        ? {
            status: "purchased",
            purchasedAt: new Date(),
            purchasedByName: body.actorName.trim(),
          }
        : {
            status: "active",
            purchasedAt: null,
            purchasedByName: null,
          },
  });

  if (body.action === "purchase") {
    await notifyPartner({
      actorName: body.actorName.trim(),
      actorTelegramId: body.actorTelegramId ?? null,
      actorUsername: body.actorUsername ?? null,
      text:
        `Раздел: ПОКУПКИ\n` +
        `Позиция закрыта: ${updatedItem.title}\n` +
        `Статус: куплено`,
    });
  }

  return NextResponse.json({ ok: true, shoppingItem: updatedItem });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const prisma = getPrisma();
  const { itemId } = await context.params;

  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    return NextResponse.json({ ok: false, error: "Shopping item not found" }, { status: 404 });
  }

  await prisma.shoppingItem.delete({
    where: { id: itemId },
  });

  return NextResponse.json({ ok: true });
}
