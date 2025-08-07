/*
  Warnings:

  - A unique constraint covering the columns `[email,storeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentValue,storeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_documentValue_key";

-- DropIndex
DROP INDEX "User_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_storeId_key" ON "User"("email", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_documentValue_storeId_key" ON "User"("documentValue", "storeId");
