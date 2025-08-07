/*
  Warnings:

  - You are about to drop the column `emailConfirmationExpires` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[documentValue]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailConfirmationExpires";

-- CreateIndex
CREATE UNIQUE INDEX "User_documentValue_key" ON "User"("documentValue");
