-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "automationPaused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "reminderAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "automationId" TEXT;
ALTER TABLE "Message" ADD COLUMN "automationName" TEXT;
ALTER TABLE "Message" ADD COLUMN "buttonsJson" TEXT;
ALTER TABLE "Message" ADD COLUMN "isNote" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Conversation_reminderAt_idx" ON "Conversation"("reminderAt");

-- CreateIndex
CREATE INDEX "Message_automationId_idx" ON "Message"("automationId");
