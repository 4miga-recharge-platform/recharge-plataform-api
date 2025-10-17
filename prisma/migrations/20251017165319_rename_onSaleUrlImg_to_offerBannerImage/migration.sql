-- Migration to safely rename onSaleUrlImg to offerBannerImage
-- This migration is designed to be safe for production deployment

-- Step 1: Add the new column
ALTER TABLE "Store" ADD COLUMN "offerBannerImage" TEXT;

-- Step 2: Copy data from old column to new column
UPDATE "Store" SET "offerBannerImage" = "onSaleUrlImg" WHERE "onSaleUrlImg" IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE "Store" DROP COLUMN "onSaleUrlImg";
