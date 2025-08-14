-- AlterEnum
ALTER TYPE "BigoRechargeStatus" ADD VALUE 'RETRY_PENDING';

-- AlterTable
ALTER TABLE "BigoRecharge" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextRetry" TIMESTAMP(3);
