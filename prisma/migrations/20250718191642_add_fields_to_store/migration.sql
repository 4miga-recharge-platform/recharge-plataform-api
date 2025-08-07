-- DropForeignKey
ALTER TABLE "Package" DROP CONSTRAINT "Package_productId_fkey";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "bannersUrl" TEXT[],
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "miniLogoUrl" TEXT,
ADD COLUMN     "onSaleUrlImg" TEXT;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
