-- Remove unique constraint on (title, storeId) from Coupon table
-- This allows creating coupons with the same name if a previous one was soft deleted
-- The uniqueness validation is now handled at the application level, filtering by deletedAt: null

DROP INDEX IF EXISTS "Coupon_title_storeId_key";




