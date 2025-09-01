-- CreateTable
CREATE TABLE "InfluencerMonthlySales" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerMonthlySales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerMonthlySales_influencerId_month_year_key" ON "InfluencerMonthlySales"("influencerId", "month", "year");

-- AddForeignKey
ALTER TABLE "InfluencerMonthlySales" ADD CONSTRAINT "InfluencerMonthlySales_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
