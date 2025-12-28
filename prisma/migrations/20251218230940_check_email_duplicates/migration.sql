-- Migration: Check for email duplicates (case-insensitive)
-- This migration ONLY READS data and creates a report table
-- It does NOT modify any existing data
-- Purpose: Identify potential duplicates before normalizing emails

BEGIN;

-- Create a temporary table to store duplicate email reports
CREATE TABLE IF NOT EXISTS "EmailDuplicatesReport" (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  duplicate_count INTEGER NOT NULL,
  affected_ids TEXT[] NOT NULL,
  affected_emails TEXT[] NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Clear any previous reports
TRUNCATE TABLE "EmailDuplicatesReport";

-- Check for duplicate emails in User table (case-insensitive, per storeId)
INSERT INTO "EmailDuplicatesReport" (table_name, normalized_email, duplicate_count, affected_ids, affected_emails)
SELECT
  'User' as table_name,
  LOWER(email) as normalized_email,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id::TEXT) as affected_ids,
  ARRAY_AGG(email) as affected_emails
FROM "User"
GROUP BY LOWER(email), "storeId"
HAVING COUNT(*) > 1;

-- Check for duplicate emails in Store table (case-insensitive, global unique)
INSERT INTO "EmailDuplicatesReport" (table_name, normalized_email, duplicate_count, affected_ids, affected_emails)
SELECT
  'Store' as table_name,
  LOWER(email) as normalized_email,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id::TEXT) as affected_ids,
  ARRAY_AGG(email) as affected_emails
FROM "Store"
WHERE email IS NOT NULL
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Check for duplicate emails in Influencer table (case-insensitive, per storeId)
-- Note: Influencer doesn't have unique constraint on email, but we check anyway
INSERT INTO "EmailDuplicatesReport" (table_name, normalized_email, duplicate_count, affected_ids, affected_emails)
SELECT
  'Influencer' as table_name,
  LOWER(email) as normalized_email,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id::TEXT) as affected_ids,
  ARRAY_AGG(email) as affected_emails
FROM "Influencer"
WHERE email IS NOT NULL
GROUP BY LOWER(email), "storeId"
HAVING COUNT(*) > 1;

-- Create a summary view for easy querying
CREATE OR REPLACE VIEW "EmailDuplicatesSummary" AS
SELECT
  table_name,
  COUNT(*) as total_duplicate_groups,
  SUM(duplicate_count) as total_affected_records
FROM "EmailDuplicatesReport"
GROUP BY table_name;

COMMIT;

-- Note: After running this migration, check the results with:
-- SELECT * FROM "EmailDuplicatesReport" ORDER BY table_name, normalized_email;
-- SELECT * FROM "EmailDuplicatesSummary";
--
-- If no duplicates are found, you can proceed with email normalization.
-- If duplicates are found, they need to be resolved manually before normalization.

