-- CreateTable
CREATE TABLE "StoreDailySales" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDailySales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMonthlySales" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalCompletedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalExpiredOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRefundedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "ordersWithCoupon" INTEGER NOT NULL DEFAULT 0,
    "ordersWithoutCoupon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMonthlySales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMonthlySalesByProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMonthlySalesByProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreDailySales_storeId_date_idx" ON "StoreDailySales"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDailySales_storeId_date_key" ON "StoreDailySales"("storeId", "date");

-- CreateIndex
CREATE INDEX "StoreMonthlySales_storeId_year_month_idx" ON "StoreMonthlySales"("storeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMonthlySales_storeId_month_year_key" ON "StoreMonthlySales"("storeId", "month", "year");

-- CreateIndex
CREATE INDEX "StoreMonthlySalesByProduct_storeId_year_month_idx" ON "StoreMonthlySalesByProduct"("storeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMonthlySalesByProduct_storeId_productId_month_year_key" ON "StoreMonthlySalesByProduct"("storeId", "productId", "month", "year");

-- AddForeignKey
ALTER TABLE "StoreDailySales" ADD CONSTRAINT "StoreDailySales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMonthlySales" ADD CONSTRAINT "StoreMonthlySales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMonthlySalesByProduct" ADD CONSTRAINT "StoreMonthlySalesByProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMonthlySalesByProduct" ADD CONSTRAINT "StoreMonthlySalesByProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
