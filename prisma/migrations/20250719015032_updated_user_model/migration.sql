-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailConfirmationCode" TEXT,
ADD COLUMN     "emailConfirmationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
