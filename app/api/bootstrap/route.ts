import { getPrisma } from "@/lib/prisma";
import { ensureCatalogSeed } from "@/lib/catalog";
import { NextResponse } from "next/server";

export async function GET() {
  const prisma = getPrisma();
  await ensureCatalogSeed(prisma);

  const [taskCatalog, productCatalog, openTasks, activeShoppingItems] = await Promise.all([
    prisma.taskCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.productCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.householdTask.findMany({
      where: { status: "open" },
      orderBy: [{ createdAt: "desc" }],
      include: {
        catalogItem: true,
      },
    }),
    prisma.shoppingItem.findMany({
      where: { status: "active" },
      orderBy: [{ createdAt: "desc" }],
      include: {
        catalogItem: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    taskCatalog,
    productCatalog,
    openTasks,
    activeShoppingItems,
  });
}
