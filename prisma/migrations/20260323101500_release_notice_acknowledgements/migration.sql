CREATE TABLE "ReleaseNoticeAcknowledgement" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseNoticeAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReleaseNoticeAcknowledgement_telegramUserId_versionKey_key"
ON "ReleaseNoticeAcknowledgement"("telegramUserId", "versionKey");

CREATE INDEX "ReleaseNoticeAcknowledgement_telegramUserId_acknowledgedAt_idx"
ON "ReleaseNoticeAcknowledgement"("telegramUserId", "acknowledgedAt");
