import type { PrismaClient } from "@/generated/prisma/client";

type HouseholdRevision = {
  stamp: string;
};

export async function getHouseholdRevision(
  prisma: PrismaClient,
  householdId: string,
): Promise<HouseholdRevision> {
  const [latestTask, latestShoppingItem] = await Promise.all([
    prisma.householdTask.findFirst({
      where: { householdId },
      orderBy: [{ updatedAt: "desc" }],
      select: { updatedAt: true, id: true },
    }),
    prisma.shoppingItem.findFirst({
      where: { householdId },
      orderBy: [{ updatedAt: "desc" }],
      select: { updatedAt: true, id: true },
    }),
  ]);

  const entries = [latestTask, latestShoppingItem]
    .filter((entry): entry is { updatedAt: Date; id: string } => Boolean(entry))
    .map(entry => `${entry.updatedAt.toISOString()}:${entry.id}`)
    .sort();

  return {
    stamp: entries.join("|") || "empty",
  };
}
