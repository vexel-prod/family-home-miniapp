import { getPrisma } from "@/lib/prisma";
import { ensureCatalogSeed } from "@/lib/catalog";
import { NextResponse } from "next/server";

type CreateTaskPayload = {
  catalogItemId?: string;
  note?: string | null;
  addedByName?: string;
  addedByUsername?: string | null;
  addedByTelegramId?: string | null;
};

export async function POST(request: Request) {
  const prisma = getPrisma();
  await ensureCatalogSeed(prisma);

  const body = (await request.json()) as CreateTaskPayload;

  if (!body.catalogItemId || !body.addedByName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing task data" }, { status: 400 });
  }

  const catalogItem = await prisma.taskCatalogItem.findUnique({
    where: { id: body.catalogItemId },
  });

  if (!catalogItem || !catalogItem.isActive) {
    return NextResponse.json({ ok: false, error: "Task catalog item not found" }, { status: 404 });
  }

  const task = await prisma.householdTask.create({
    data: {
      catalogItemId: catalogItem.id,
      note: body.note?.trim() || null,
      addedByName: body.addedByName.trim(),
      addedByUsername: body.addedByUsername ?? null,
      addedByTelegramId: body.addedByTelegramId ?? null,
    },
    include: {
      catalogItem: true,
    },
  });

  return NextResponse.json({ ok: true, task });
}
