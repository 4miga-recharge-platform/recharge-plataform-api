/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `domain` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add domain column as nullable first
ALTER TABLE "Store" ADD COLUMN "domain" TEXT;

-- Step 2: Update existing records with unique domain values
-- Store 1: Loja Exemplo 1
UPDATE "Store" SET "domain" = 'https://www.4miga.games' WHERE "id" = 'c049f013-8a5d-4b68-ae2b-ec0818dce9fa';

-- Store 2: Loja Exemplo 2
UPDATE "Store" SET "domain" = 'https://loja.4miga.games' WHERE "id" = 'd28dc9c9-bcb8-4980-8cda-4a278572d912';

-- Step 3: Make domain column NOT NULL
ALTER TABLE "Store" ALTER COLUMN "domain" SET NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX "Store_domain_key" ON "Store"("domain");
