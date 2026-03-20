-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "completedTasksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "experiencePoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fastTasksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overdueTasksCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HouseholdTask" ADD COLUMN     "assignedMemberId" TEXT,
ADD COLUMN     "assignedMemberName" TEXT,
ADD COLUMN     "rewardUnits" INTEGER,
ALTER COLUMN "deadlineAt" SET DEFAULT (now() + interval '24 hours');

