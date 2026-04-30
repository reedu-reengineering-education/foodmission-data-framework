/*
  Warnings:

  - You are about to drop the column `title` on the `Pantry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Pantry` will be added. If there are existing duplicate values, this will fail.
  
*/
-- DropForeignKey
ALTER TABLE "Pantry" DROP CONSTRAINT "Pantry_userId_fkey";

-- DropIndex
DROP INDEX "Pantry_userId_title_key";

-- Step 1: For users with multiple pantries, identify the oldest pantry to keep per user
-- Create a temporary table with the pantries to keep (oldest per user)
CREATE TEMP TABLE pantries_to_keep AS
SELECT DISTINCT ON ("userId") id, "userId"
FROM "Pantry"
ORDER BY "userId", "createdAt" ASC;

-- Step 2: Update all pantry items from duplicate pantries to point to the kept pantry
UPDATE "pantry_items"
SET "pantryId" = (
  SELECT ptk.id 
  FROM pantries_to_keep ptk 
  WHERE ptk."userId" = (
    SELECT p."userId" 
    FROM "Pantry" p 
    WHERE p.id = "pantry_items"."pantryId"
  )
)
WHERE "pantryId" NOT IN (SELECT id FROM pantries_to_keep);

-- Step 3: Delete duplicate pantries (keep only the oldest per user)
DELETE FROM "Pantry"
WHERE id NOT IN (SELECT id FROM pantries_to_keep);

-- Step 4: Drop the temporary table
DROP TABLE pantries_to_keep;

-- AlterTable
ALTER TABLE "Pantry" DROP COLUMN "title";

-- CreateIndex
CREATE UNIQUE INDEX "Pantry_userId_key" ON "Pantry"("userId");

-- AddForeignKey
ALTER TABLE "Pantry" ADD CONSTRAINT "Pantry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
