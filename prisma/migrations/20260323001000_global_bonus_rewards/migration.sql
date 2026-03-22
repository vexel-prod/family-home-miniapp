-- CreateTable
CREATE TABLE "public"."GlobalBonusReward" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costUnits" INTEGER NOT NULL,
    "sourceLabel" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalBonusReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalBonusReward_sourceKey_key" ON "public"."GlobalBonusReward"("sourceKey");

-- CreateIndex
CREATE INDEX "GlobalBonusReward_isArchived_createdAt_idx" ON "public"."GlobalBonusReward"("isArchived", "createdAt");
