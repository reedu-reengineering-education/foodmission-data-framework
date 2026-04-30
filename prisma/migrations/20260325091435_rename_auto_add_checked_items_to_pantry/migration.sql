/*
  Warnings:

  - You are about to drop the column `shouldAutoAddToPantry` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "shouldAutoAddToPantry",
ADD COLUMN     "autoAddCheckedItemsToPantry" BOOLEAN NOT NULL DEFAULT true;
