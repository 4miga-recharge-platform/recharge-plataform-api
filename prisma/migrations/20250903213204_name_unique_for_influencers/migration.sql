/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Influencer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Influencer_name_key" ON "Influencer"("name");
