import { authorizeRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getCurrentMoscowMonthRange() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find(part => part.type === "year")?.value ?? new Date().getUTCFullYear());
  const month = Number(parts.find(part => part.type === "month")?.value ?? new Date().getUTCMonth() + 1);
  const start = new Date(Date.UTC(year, month - 1, 1, -3));
  const end = new Date(Date.UTC(year, month, 1, -3));

  return { start, end };
}

export async function GET(request: Request) {
  const prisma = getPrisma();
  const auth = await authorizeRequest(request, prisma);

  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getCurrentMoscowMonthRange();

  const [openTasks, completedTasks, monthlyCompletedTasks, activeShoppingItems] = await Promise.all([
    prisma.householdTask.findMany({
      where: { householdId: auth.member.householdId, status: "open" },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.householdTask.findMany({
      where: { householdId: auth.member.householdId, status: "done" },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 30,
    }),
    prisma.householdTask.findMany({
      where: {
        householdId: auth.member.householdId,
        status: "done",
        completedAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.shoppingItem.findMany({
      where: { householdId: auth.member.householdId, status: "active" },
      orderBy: [{ urgency: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json({
    ok: true,
    openTasks,
    completedTasks,
    monthlyCompletedTasks,
    activeShoppingItems,
  });
}
