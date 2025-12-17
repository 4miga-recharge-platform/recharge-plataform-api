-- Rename externalId column to braviveId
ALTER TABLE "Payment" RENAME COLUMN "externalId" TO "braviveId";

-- Rename index
DROP INDEX IF EXISTS "Payment_externalId_idx";
CREATE INDEX "Payment_braviveId_idx" ON "Payment"("braviveId");

