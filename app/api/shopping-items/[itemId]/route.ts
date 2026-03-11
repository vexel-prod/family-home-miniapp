import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type UpdateShoppingPayload = {
  action?: "purchase" | "restore";
  actorName?: string;
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
    include: {
      catalogItem: true,
    },
  });

  return NextResponse.json({ ok: true, shoppingItem: updatedItem });
}
