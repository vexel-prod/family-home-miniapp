ALTER TABLE "HouseholdTask" ADD COLUMN "addedByMemberId" TEXT;

UPDATE "HouseholdTask" AS task
SET "addedByMemberId" = member."id"
FROM "Member" AS member
WHERE task."addedByMemberId" IS NULL
  AND task."householdId" = member."householdId"
  AND task."addedByTelegramId" IS NOT NULL
  AND member."telegramUserId" = task."addedByTelegramId";

ALTER TABLE "HouseholdTask"
ADD CONSTRAINT "HouseholdTask_addedByMemberId_fkey"
FOREIGN KEY ("addedByMemberId") REFERENCES "Member"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TaskCompletionApproval" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "approverMemberId" TEXT NOT NULL,
    "requesterMemberId" TEXT NOT NULL,
    "creditedMemberId" TEXT NOT NULL,
    "creditedMemberName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "telegramChatId" TEXT,
    "telegramMessageId" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCompletionApproval_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskCompletionApproval"
ADD CONSTRAINT "TaskCompletionApproval_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCompletionApproval"
ADD CONSTRAINT "TaskCompletionApproval_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "HouseholdTask"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCompletionApproval"
ADD CONSTRAINT "TaskCompletionApproval_approverMemberId_fkey"
FOREIGN KEY ("approverMemberId") REFERENCES "Member"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCompletionApproval"
ADD CONSTRAINT "TaskCompletionApproval_requesterMemberId_fkey"
FOREIGN KEY ("requesterMemberId") REFERENCES "Member"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCompletionApproval"
ADD CONSTRAINT "TaskCompletionApproval_creditedMemberId_fkey"
FOREIGN KEY ("creditedMemberId") REFERENCES "Member"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "TaskCompletionApproval_approverMemberId_status_createdAt_idx"
ON "TaskCompletionApproval"("approverMemberId", "status", "createdAt");

CREATE INDEX "TaskCompletionApproval_taskId_status_idx"
ON "TaskCompletionApproval"("taskId", "status");

CREATE INDEX "TaskCompletionApproval_householdId_status_createdAt_idx"
ON "TaskCompletionApproval"("householdId", "status", "createdAt");
