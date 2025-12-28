-- Delete all data from WebhookLog table
DELETE FROM "WebhookLog";

-- Drop all indexes
DROP INDEX IF EXISTS "WebhookLog_createdAt_idx";
DROP INDEX IF EXISTS "WebhookLog_processed_idx";
DROP INDEX IF EXISTS "WebhookLog_status_idx";
DROP INDEX IF EXISTS "WebhookLog_braviveId_idx";
DROP INDEX IF EXISTS "WebhookLog_externalId_idx";

-- Drop the table
DROP TABLE IF EXISTS "WebhookLog";


