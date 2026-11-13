-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "sourceAutomationId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "sourceAutomationName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastAutomationId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastAutomationName" TEXT;

-- CreateIndex
CREATE INDEX "Contact_sourceAutomationId_idx" ON "Contact"("sourceAutomationId");

-- Backfill: earliest automation message → source
UPDATE "Contact" AS c
SET
  "sourceAutomationId" = sub."automationId",
  "sourceAutomationName" = sub."automationName"
FROM (
  SELECT DISTINCT ON (conv."contactId")
    conv."contactId",
    m."automationId",
    m."automationName"
  FROM "Message" m
  INNER JOIN "Conversation" conv ON conv."id" = m."conversationId"
  WHERE m."automationName" IS NOT NULL
    AND btrim(m."automationName") <> ''
  ORDER BY conv."contactId", m."sentAt" ASC
) AS sub
WHERE c."id" = sub."contactId"
  AND c."sourceAutomationName" IS NULL;

-- Backfill: latest automation message → last
UPDATE "Contact" AS c
SET
  "lastAutomationId" = sub."automationId",
  "lastAutomationName" = sub."automationName"
FROM (
  SELECT DISTINCT ON (conv."contactId")
    conv."contactId",
    m."automationId",
    m."automationName"
  FROM "Message" m
  INNER JOIN "Conversation" conv ON conv."id" = m."conversationId"
  WHERE m."automationName" IS NOT NULL
    AND btrim(m."automationName") <> ''
  ORDER BY conv."contactId", m."sentAt" DESC
) AS sub
WHERE c."id" = sub."contactId"
  AND c."lastAutomationName" IS NULL;
