/*
  Warnings:

  - You are about to drop the column `mealType` on the `Meal` table. All the data in the column will be lost.
  - You are about to drop the column `mealId` on the `recipes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `recipes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_mealId_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_userId_fkey";

-- DropIndex
DROP INDEX "Meal_mealType_idx";

-- DropIndex
DROP INDEX "recipes_mealId_idx";

-- AlterTable
ALTER TABLE "Meal" DROP COLUMN "mealType",
ADD COLUMN     "recipeId" TEXT;

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "mealId",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cuisineType" TEXT,
ADD COLUMN     "dietaryLabels" TEXT[],
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "ingredients" JSONB,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- DropEnum
DROP TYPE "MealType";

-- CreateIndex
CREATE INDEX "Meal_recipeId_idx" ON "Meal"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_externalId_key" ON "recipes"("externalId");

-- CreateIndex
CREATE INDEX "recipes_isPublic_idx" ON "recipes"("isPublic");

-- CreateIndex
CREATE INDEX "recipes_category_idx" ON "recipes"("category");

-- CreateIndex
CREATE INDEX "recipes_cuisineType_idx" ON "recipes"("cuisineType");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
