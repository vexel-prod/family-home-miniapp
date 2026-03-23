-- CreateTable
CREATE TABLE "public"."TaskDeadlineNotification" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT,
    "kind" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskDeadlineNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDeadlineNotification_taskId_kind_memberId_key"
ON "public"."TaskDeadlineNotification"("taskId", "kind", "memberId");

-- CreateIndex
CREATE INDEX "TaskDeadlineNotification_scheduledFor_sentAt_canceledAt_idx"
ON "public"."TaskDeadlineNotification"("scheduledFor", "sentAt", "canceledAt");

-- CreateIndex
CREATE INDEX "TaskDeadlineNotification_householdId_scheduledFor_idx"
ON "public"."TaskDeadlineNotification"("householdId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "public"."TaskDeadlineNotification"
ADD CONSTRAINT "TaskDeadlineNotification_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "public"."HouseholdTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskDeadlineNotification"
ADD CONSTRAINT "TaskDeadlineNotification_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskDeadlineNotification"
ADD CONSTRAINT "TaskDeadlineNotification_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
