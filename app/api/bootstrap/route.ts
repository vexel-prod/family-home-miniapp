import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const prisma = getPrisma();

  const [openTasks, activeShoppingItems] = await Promise.all([
    prisma.householdTask.findMany({
      where: { status: "open" },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.shoppingItem.findMany({
      where: { status: "active" },
      orderBy: [{ urgency: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json({
    ok: true,
    openTasks,
    activeShoppingItems,
  });
}
