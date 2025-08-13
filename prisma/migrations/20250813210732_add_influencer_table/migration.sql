/*
  Warnings:

  - You are about to drop the column `influencerName` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `paymentData` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Coupon` table. All the data in the column will be lost.
  - Added the required column `influencerId` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create the Influencer table
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "paymentMethod" TEXT,
    "paymentData" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index for Influencer
CREATE UNIQUE INDEX "Influencer_name_storeId_key" ON "Influencer"("name", "storeId");

-- Step 3: Add foreign key for Influencer
ALTER TABLE "Influencer" ADD CONSTRAINT "Influencer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Add new columns to Coupon table FIRST
ALTER TABLE "Coupon" ADD COLUMN "influencerId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "isFirstPurchase" BOOLEAN NOT NULL DEFAULT false;

-- Step 5: Create default influencers for each store and update coupons
DO $$
DECLARE
    store_record RECORD;
    influencer_id TEXT;
BEGIN
    FOR store_record IN SELECT DISTINCT "storeId" FROM "Coupon" LOOP
        -- Create a default influencer for each store
        INSERT INTO "Influencer" ("id", "name", "email", "phone", "paymentMethod", "paymentData", "isActive", "storeId", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid()::TEXT,
            'Default Influencer',
            'default@example.com',
            '11999999999',
            'pix',
            'PIX_DEFAULT',
            true,
            store_record."storeId",
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING "id" INTO influencer_id;

        -- Update all coupons for this store to use the new influencer
        UPDATE "Coupon"
        SET "influencerId" = influencer_id
        WHERE "storeId" = store_record."storeId";
    END LOOP;
END $$;

-- Step 6: Make influencerId NOT NULL after populating it
ALTER TABLE "Coupon" ALTER COLUMN "influencerId" SET NOT NULL;

-- Step 7: Add foreign key for Coupon
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Remove old columns from Coupon table
ALTER TABLE "Coupon" DROP COLUMN "influencerName";
ALTER TABLE "Coupon" DROP COLUMN "paymentData";
ALTER TABLE "Coupon" DROP COLUMN "paymentMethod";
