/*
  Warnings:

  - You are about to drop the column `foodCategoryId` on the `Meal` table. All the data in the column will be lost.
  - You are about to drop the column `foodId` on the `Meal` table. All the data in the column will be lost.
  - You are about to drop the column `itemType` on the `Meal` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Meal" DROP CONSTRAINT "Meal_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Meal" DROP CONSTRAINT "Meal_foodId_fkey";

-- AlterTable
ALTER TABLE "public"."Meal" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
DROP COLUMN "itemType";

-- CreateTable
CREATE TABLE "public"."meal_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" "public"."Unit" NOT NULL DEFAULT 'PIECES',
    "notes" TEXT,
    "mealId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'food',
    "foodId" TEXT,
    "foodCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_items_mealId_idx" ON "public"."meal_items"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_items_mealId_foodId_key" ON "public"."meal_items"("mealId", "foodId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_items_mealId_foodCategoryId_key" ON "public"."meal_items"("mealId", "foodCategoryId");

-- AddForeignKey
ALTER TABLE "public"."meal_items" ADD CONSTRAINT "meal_items_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "public"."Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_items" ADD CONSTRAINT "meal_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_items" ADD CONSTRAINT "meal_items_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "public"."food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
