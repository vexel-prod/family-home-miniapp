import { getPrisma } from "@/lib/prisma";
import { ensureCatalogSeed } from "@/lib/catalog";
import { NextResponse } from "next/server";

type CreateShoppingPayload = {
  catalogItemId?: string;
  urgency?: "soon" | "out";
  quantityLabel?: string | null;
  note?: string | null;
  addedByName?: string;
  addedByUsername?: string | null;
  addedByTelegramId?: string | null;
};

export async function POST(request: Request) {
  const prisma = getPrisma();
  await ensureCatalogSeed(prisma);

  const body = (await request.json()) as CreateShoppingPayload;

  if (!body.catalogItemId || !body.addedByName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing shopping item data" }, { status: 400 });
  }

  const catalogItem = await prisma.productCatalogItem.findUnique({
    where: { id: body.catalogItemId },
  });

  if (!catalogItem || !catalogItem.isActive) {
    return NextResponse.json({ ok: false, error: "Product catalog item not found" }, { status: 404 });
  }

  const shoppingItem = await prisma.shoppingItem.create({
    data: {
      catalogItemId: catalogItem.id,
      urgency: body.urgency === "out" ? "out" : "soon",
      quantityLabel: body.quantityLabel?.trim() || null,
      note: body.note?.trim() || null,
      addedByName: body.addedByName.trim(),
      addedByUsername: body.addedByUsername ?? null,
      addedByTelegramId: body.addedByTelegramId ?? null,
    },
    include: {
      catalogItem: true,
    },
  });

  return NextResponse.json({ ok: true, shoppingItem });
}
