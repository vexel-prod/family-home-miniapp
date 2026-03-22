ALTER TABLE "Member"
DROP COLUMN "appUserId",
DROP COLUMN "completedTasksCount",
DROP COLUMN "experiencePoints",
DROP COLUMN "fastTasksCount",
DROP COLUMN "level",
DROP COLUMN "overdueTasksCount";

DROP TABLE IF EXISTS "AppSession" CASCADE;
DROP TABLE IF EXISTS "AppUser" CASCADE;
DROP TABLE IF EXISTS "AuthIdentity" CASCADE;
DROP TABLE IF EXISTS "IdentityLinkCode" CASCADE;
DROP TABLE IF EXISTS "MobileAuthRequest" CASCADE;
