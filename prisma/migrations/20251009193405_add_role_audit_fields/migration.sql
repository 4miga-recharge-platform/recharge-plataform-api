-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleChangedAt" TIMESTAMP(3),
ADD COLUMN     "roleChangedBy" TEXT;
