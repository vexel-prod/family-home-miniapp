CREATE TABLE "public"."BrowserLoginSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserLoginSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserLoginSession_token_key" ON "public"."BrowserLoginSession"("token");
CREATE INDEX "BrowserLoginSession_expiresAt_idx" ON "public"."BrowserLoginSession"("expiresAt");
CREATE INDEX "BrowserLoginSession_telegramUserId_approvedAt_idx" ON "public"."BrowserLoginSession"("telegramUserId", "approvedAt");
