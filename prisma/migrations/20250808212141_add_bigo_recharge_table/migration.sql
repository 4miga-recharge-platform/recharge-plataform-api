-- CreateEnum
CREATE TYPE "BigoRechargeStatus" AS ENUM ('REQUESTED', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "BigoRecharge" (
    "id" TEXT NOT NULL,
    "seqid" TEXT NOT NULL,
    "buOrderId" TEXT,
    "endpoint" TEXT NOT NULL,
    "status" "BigoRechargeStatus" NOT NULL,
    "rescode" INTEGER,
    "message" TEXT,
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "BigoRecharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BigoRecharge_seqid_key" ON "BigoRecharge"("seqid");

-- CreateIndex
CREATE UNIQUE INDEX "BigoRecharge_buOrderId_key" ON "BigoRecharge"("buOrderId");

-- AddForeignKey
ALTER TABLE "BigoRecharge" ADD CONSTRAINT "BigoRecharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
