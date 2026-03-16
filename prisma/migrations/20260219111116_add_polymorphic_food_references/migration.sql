/*
  Warnings:

  - You are about to drop the column `pantryItemId` on the `Meal` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pantryId,foodId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pantryId,foodCategoryId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shoppingListId,foodCategoryId]` on the table `shopping_list_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Meal" DROP CONSTRAINT "Meal_pantryItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pantry_items" DROP CONSTRAINT "pantry_items_foodId_fkey";

-- DropForeignKey
ALTER TABLE "public"."shopping_list_items" DROP CONSTRAINT "shopping_list_items_foodId_fkey";

-- AlterTable
ALTER TABLE "public"."Meal" DROP COLUMN "pantryItemId",
ADD COLUMN     "foodCategoryId" TEXT,
ADD COLUMN     "foodId" TEXT,
ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'food';

-- AlterTable
ALTER TABLE "public"."pantry_items" ADD COLUMN     "foodCategoryId" TEXT,
ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'food',
ALTER COLUMN "foodId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."shopping_list_items" ADD COLUMN     "foodCategoryId" TEXT,
ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'food',
ALTER COLUMN "foodId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_pantryId_foodId_key" ON "public"."pantry_items"("pantryId", "foodId");

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_pantryId_foodCategoryId_key" ON "public"."pantry_items"("pantryId", "foodCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_items_shoppingListId_foodCategoryId_key" ON "public"."shopping_list_items"("shoppingListId", "foodCategoryId");

-- AddForeignKey
ALTER TABLE "public"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "public"."food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pantry_items" ADD CONSTRAINT "pantry_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pantry_items" ADD CONSTRAINT "pantry_items_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "public"."food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meal" ADD CONSTRAINT "Meal_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meal" ADD CONSTRAINT "Meal_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "public"."food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
