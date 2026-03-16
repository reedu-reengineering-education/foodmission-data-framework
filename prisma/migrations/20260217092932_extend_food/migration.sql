/*
  Warnings:

  - You are about to drop the column `openFoodFactsId` on the `foods` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."foods_openFoodFactsId_key";

-- AlterTable
ALTER TABLE "public"."foods" DROP COLUMN "openFoodFactsId";
