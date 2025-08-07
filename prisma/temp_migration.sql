-- First add userId as nullable
ALTER TABLE "Order" ADD COLUMN "userId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing orders with a default user
UPDATE "Order" SET "userId" = 'b180ca0a-ead5-48df-ac2f-8512a585acec';

-- Make userId required after data is migrated
ALTER TABLE "Order" ALTER COLUMN "userId" SET NOT NULL;
