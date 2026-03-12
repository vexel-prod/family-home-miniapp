import { authorizeRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const prisma = getPrisma();
  const auth = await authorizeRequest(request, prisma);

  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [openTasks, activeShoppingItems] = await Promise.all([
    prisma.householdTask.findMany({
      where: { householdId: auth.member.householdId, status: "open" },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.shoppingItem.findMany({
      where: { householdId: auth.member.householdId, status: "active" },
      orderBy: [{ urgency: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json({
    ok: true,
    openTasks,
    activeShoppingItems,
  });
}
