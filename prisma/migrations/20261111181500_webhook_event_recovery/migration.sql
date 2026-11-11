-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN "externalId" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebhookEvent" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_externalId_key" ON "WebhookEvent"("externalId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_createdAt_idx" ON "WebhookEvent"("processed", "createdAt");
