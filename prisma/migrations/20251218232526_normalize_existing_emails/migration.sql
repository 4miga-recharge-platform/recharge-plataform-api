-- Migration: Normalize existing emails to lowercase
-- This migration normalizes all existing emails in the database to lowercase
-- Prerequisite: Run check_email_duplicates migration first to ensure no duplicates exist

BEGIN;

-- Normalize User emails
UPDATE "User"
SET email = LOWER(email)
WHERE email != LOWER(email);

-- Normalize Store emails
UPDATE "Store"
SET email = LOWER(email)
WHERE email IS NOT NULL
AND email != LOWER(email);

-- Normalize Influencer emails
UPDATE "Influencer"
SET email = LOWER(email)
WHERE email IS NOT NULL
AND email != LOWER(email);

COMMIT;





