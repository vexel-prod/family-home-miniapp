import type { PrismaClient } from "@/generated/prisma/client";

type HouseholdRevision = {
  stamp: string;
};

export async function getHouseholdRevision(
  prisma: PrismaClient,
  householdId: string,
): Promise<HouseholdRevision> {
  const [latestTask, latestShoppingItem, latestBonusTransaction, latestBonusPurchase, latestMonthlyReport] = await Promise.all([
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
    prisma.bonusTransaction.findFirst({
      where: { householdId },
      orderBy: [{ updatedAt: "desc" }],
      select: { updatedAt: true, id: true },
    }),
    prisma.bonusPurchase.findFirst({
      where: { householdId },
      orderBy: [{ updatedAt: "desc" }],
      select: { updatedAt: true, id: true },
    }),
    prisma.monthlyReport.findFirst({
      where: { householdId },
      orderBy: [{ updatedAt: "desc" }],
      select: { updatedAt: true, id: true },
    }),
  ]);

  const entries = [latestTask, latestShoppingItem, latestBonusTransaction, latestBonusPurchase, latestMonthlyReport]
    .filter((entry): entry is { updatedAt: Date; id: string } => Boolean(entry))
    .map(entry => `${entry.updatedAt.toISOString()}:${entry.id}`)
    .sort();

  return {
    stamp: entries.join("|") || "empty",
  };
}
