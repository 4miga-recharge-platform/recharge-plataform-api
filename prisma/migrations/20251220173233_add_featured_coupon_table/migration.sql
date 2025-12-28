-- CreateTable
CREATE TABLE "FeaturedCoupon" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedCoupon_storeId_couponId_key" ON "FeaturedCoupon"("storeId", "couponId");

-- CreateIndex
CREATE INDEX "FeaturedCoupon_storeId_idx" ON "FeaturedCoupon"("storeId");

-- AddForeignKey
ALTER TABLE "FeaturedCoupon" ADD CONSTRAINT "FeaturedCoupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedCoupon" ADD CONSTRAINT "FeaturedCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

