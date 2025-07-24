/*
  Warnings:

  - You are about to drop the column `password` on the `Store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[wppNumber]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "password",
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "wppNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_wppNumber_key" ON "Store"("wppNumber");
