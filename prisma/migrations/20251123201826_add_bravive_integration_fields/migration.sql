-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "paymentProvider" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "braviveApiToken" TEXT;

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");
