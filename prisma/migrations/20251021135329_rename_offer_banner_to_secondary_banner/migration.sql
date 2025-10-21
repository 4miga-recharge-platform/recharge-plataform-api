-- Migration to safely rename offerBannerImage to secondaryBannerUrl and make email optional
-- This migration is designed to be safe for production deployment

-- Step 1: Rename the column offerBannerImage to secondaryBannerUrl (preserves all data)
ALTER TABLE "Store" RENAME COLUMN "offerBannerImage" TO "secondaryBannerUrl";

-- Step 2: Make email column nullable (this preserves all existing data)
-- The column is already nullable in the schema, but we ensure the constraint is correct
ALTER TABLE "Store" ALTER COLUMN "email" DROP NOT NULL;
