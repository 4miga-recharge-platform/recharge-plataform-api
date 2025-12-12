-- AlterTable
ALTER TABLE "Order" ADD COLUMN "basePrice" DECIMAL(10, 2);

-- Update existing orders: set basePrice = price (historical data)
UPDATE "Order" SET "basePrice" = "price";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "basePrice" SET NOT NULL;



