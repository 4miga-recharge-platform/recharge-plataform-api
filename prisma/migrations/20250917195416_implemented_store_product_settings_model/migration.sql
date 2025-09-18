-- DropIndex
DROP INDEX "Influencer_name_key";

-- CreateTable
CREATE TABLE "StoreProductSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "imgBannerUrl" TEXT,
    "imgCardUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProductSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductSettings_storeId_productId_key" ON "StoreProductSettings"("storeId", "productId");

-- AddForeignKey
ALTER TABLE "StoreProductSettings" ADD CONSTRAINT "StoreProductSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductSettings" ADD CONSTRAINT "StoreProductSettings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
