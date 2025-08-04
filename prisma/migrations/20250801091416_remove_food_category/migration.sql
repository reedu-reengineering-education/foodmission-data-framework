/*
  Warnings:

  - You are about to drop the column `categoryId` on the `foods` table. All the data in the column will be lost.
  - You are about to drop the `food_categories` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `preferences` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `settings` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."foods" DROP CONSTRAINT "foods_categoryId_fkey";

-- DropIndex
DROP INDEX "public"."foods_categoryId_idx";

-- DropIndex
DROP INDEX "public"."foods_name_categoryId_idx";

-- AlterTable
ALTER TABLE "public"."foods" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "preferences" SET NOT NULL,
ALTER COLUMN "settings" SET NOT NULL;

-- DropTable
DROP TABLE "public"."food_categories";
