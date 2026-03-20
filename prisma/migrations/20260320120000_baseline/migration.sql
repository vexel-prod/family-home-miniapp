-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."ActionRateLimit" (
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."BonusPurchase" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "rewardKey" TEXT NOT NULL,
    "rewardTitle" TEXT NOT NULL,
    "costUnits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BonusReward" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdByMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costUnits" INTEGER NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BonusTransaction" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "taskId" TEXT,
    "purchaseId" TEXT,
    "monthKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountUnits" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FamilyGoal" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdByMemberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "unitLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "sharedGoalUnits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HouseholdInvite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdByMemberId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HouseholdTask" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    "addedByName" TEXT NOT NULL,
    "addedByUsername" TEXT,
    "addedByTelegramId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '24:00:00'::interval),
    "lastDeadlineReminderAt" TIMESTAMP(3),
    "penaltyAppliedAt" TIMESTAMP(3),
    "penaltyAppliedUnits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HouseholdTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "chatId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bonusBalanceUnits" INTEGER NOT NULL DEFAULT 0,
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'member',
    "completedTasksCount" INTEGER NOT NULL DEFAULT 0,
    "fastTasksCount" INTEGER NOT NULL DEFAULT 0,
    "overdueTasksCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlyReport" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportBody" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingItem" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "urgency" TEXT NOT NULL DEFAULT 'soon',
    "quantityLabel" TEXT,
    "note" TEXT,
    "addedByName" TEXT NOT NULL,
    "addedByUsername" TEXT,
    "addedByTelegramId" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "purchasedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionRateLimit_action_scope_idx" ON "public"."ActionRateLimit"("action" ASC, "scope" ASC);

-- CreateIndex
CREATE INDEX "ActionRateLimit_blockedUntil_idx" ON "public"."ActionRateLimit"("blockedUntil" ASC);

-- CreateIndex
CREATE INDEX "BonusPurchase_householdId_monthKey_memberId_idx" ON "public"."BonusPurchase"("householdId" ASC, "monthKey" ASC, "memberId" ASC);

-- CreateIndex
CREATE INDEX "BonusReward_householdId_isArchived_createdAt_idx" ON "public"."BonusReward"("householdId" ASC, "isArchived" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "BonusTransaction_householdId_monthKey_memberId_idx" ON "public"."BonusTransaction"("householdId" ASC, "monthKey" ASC, "memberId" ASC);

-- CreateIndex
CREATE INDEX "BonusTransaction_taskId_kind_idx" ON "public"."BonusTransaction"("taskId" ASC, "kind" ASC);

-- CreateIndex
CREATE INDEX "FamilyGoal_householdId_isActive_createdAt_idx" ON "public"."FamilyGoal"("householdId" ASC, "isActive" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvite_code_key" ON "public"."HouseholdInvite"("code" ASC);

-- CreateIndex
CREATE INDEX "HouseholdInvite_householdId_expiresAt_idx" ON "public"."HouseholdInvite"("householdId" ASC, "expiresAt" ASC);

-- CreateIndex
CREATE INDEX "HouseholdTask_householdId_status_createdAt_idx" ON "public"."HouseholdTask"("householdId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "HouseholdTask_householdId_status_deadlineAt_idx" ON "public"."HouseholdTask"("householdId" ASC, "status" ASC, "deadlineAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Member_chatId_key" ON "public"."Member"("chatId" ASC);

-- CreateIndex
CREATE INDEX "Member_householdId_isActive_idx" ON "public"."Member"("householdId" ASC, "isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Member_telegramUserId_key" ON "public"."Member"("telegramUserId" ASC);

-- CreateIndex
CREATE INDEX "MonthlyReport_householdId_createdAt_idx" ON "public"."MonthlyReport"("householdId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_householdId_monthKey_key" ON "public"."MonthlyReport"("householdId" ASC, "monthKey" ASC);

-- CreateIndex
CREATE INDEX "ShoppingItem_householdId_status_createdAt_idx" ON "public"."ShoppingItem"("householdId" ASC, "status" ASC, "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "public"."BonusPurchase" ADD CONSTRAINT "BonusPurchase_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusPurchase" ADD CONSTRAINT "BonusPurchase_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusReward" ADD CONSTRAINT "BonusReward_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusReward" ADD CONSTRAINT "BonusReward_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusTransaction" ADD CONSTRAINT "BonusTransaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusTransaction" ADD CONSTRAINT "BonusTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusTransaction" ADD CONSTRAINT "BonusTransaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."BonusPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusTransaction" ADD CONSTRAINT "BonusTransaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."HouseholdTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyGoal" ADD CONSTRAINT "FamilyGoal_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyGoal" ADD CONSTRAINT "FamilyGoal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HouseholdTask" ADD CONSTRAINT "HouseholdTask_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyReport" ADD CONSTRAINT "MonthlyReport_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

