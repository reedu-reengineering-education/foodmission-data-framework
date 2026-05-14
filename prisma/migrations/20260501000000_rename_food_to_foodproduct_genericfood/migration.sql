/*
  Warnings:

  - You are about to drop the column `foodCategoryId` on the `meal_items` table. All the data in the column will be lost.
  - You are about to drop the column `foodId` on the `meal_items` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategoryId` on the `pantry_items` table. All the data in the column will be lost.
  - You are about to drop the column `foodId` on the `pantry_items` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategoryId` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `foodId` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategoryId` on the `shopping_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `foodId` on the `shopping_list_items` table. All the data in the column will be lost.
  - The `foods` table is renamed to `food_products` (data preserved).
  - The `food_categories` table is renamed to `generic_foods` (data preserved).
  - You are about to drop the column `foodId` on the `food_waste` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategoryId` on the `food_waste` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mealId,foodProductId]` on the table `meal_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mealId,genericFoodId]` on the table `meal_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pantryId,foodProductId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pantryId,genericFoodId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shoppingListId,foodProductId]` on the table `shopping_list_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shoppingListId,genericFoodId]` on the table `shopping_list_items` will be added. If there are existing duplicate values, this will fail.

*/

-- DropForeignKey (shelfLifeId FKs on catalog tables — re-added at end with new names)
ALTER TABLE "food_categories" DROP CONSTRAINT "food_categories_shelfLifeId_fkey";

-- DropForeignKey
ALTER TABLE "foods" DROP CONSTRAINT "foods_shelfLifeId_fkey";

-- DropForeignKey
ALTER TABLE "food_waste" DROP CONSTRAINT "food_waste_foodId_fkey";

-- DropForeignKey
ALTER TABLE "food_waste" DROP CONSTRAINT "food_waste_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "meal_items" DROP CONSTRAINT "meal_items_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "meal_items" DROP CONSTRAINT "meal_items_foodId_fkey";

-- DropForeignKey
ALTER TABLE "pantry_items" DROP CONSTRAINT "pantry_items_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "pantry_items" DROP CONSTRAINT "pantry_items_foodId_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_foodId_fkey";

-- DropForeignKey
ALTER TABLE "shopping_list_items" DROP CONSTRAINT "shopping_list_items_foodCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "shopping_list_items" DROP CONSTRAINT "shopping_list_items_foodId_fkey";

-- DropIndex
DROP INDEX "meal_items_foodCategoryId_idx";

-- DropIndex
DROP INDEX "meal_items_foodId_idx";

-- DropIndex
DROP INDEX "meal_items_mealId_foodCategoryId_key";

-- DropIndex
DROP INDEX "meal_items_mealId_foodId_key";

-- DropIndex
DROP INDEX "pantry_items_foodCategoryId_idx";

-- DropIndex
DROP INDEX "pantry_items_foodId_idx";

-- DropIndex
DROP INDEX "pantry_items_pantryId_foodCategoryId_key";

-- DropIndex
DROP INDEX "pantry_items_pantryId_foodId_key";

-- DropIndex
DROP INDEX "recipe_ingredients_foodCategoryId_idx";

-- DropIndex
DROP INDEX "recipe_ingredients_foodId_idx";

-- DropIndex
DROP INDEX "shopping_list_items_foodCategoryId_idx";

-- DropIndex
DROP INDEX "shopping_list_items_foodId_idx";

-- DropIndex
DROP INDEX "shopping_list_items_shoppingListId_foodCategoryId_key";

-- DropIndex
DROP INDEX "shopping_list_items_shoppingListId_foodId_key";

-- DropIndex
DROP INDEX "food_waste_foodId_idx";

-- DropIndex
DROP INDEX "food_waste_foodCategoryId_idx";

-- AddColumn (new columns first, so we can backfill before dropping old ones)
ALTER TABLE "meal_items"
  ADD COLUMN "foodProductId" TEXT,
  ADD COLUMN "genericFoodId" TEXT;

-- AddColumn
ALTER TABLE "pantry_items"
  ADD COLUMN "foodProductId" TEXT,
  ADD COLUMN "genericFoodId" TEXT;

-- AddColumn
ALTER TABLE "recipe_ingredients"
  ADD COLUMN "foodProductId" TEXT,
  ADD COLUMN "genericFoodId" TEXT;

-- AddColumn
ALTER TABLE "shopping_list_items"
  ADD COLUMN "foodProductId" TEXT,
  ADD COLUMN "genericFoodId" TEXT;

-- AddColumn
ALTER TABLE "food_waste"
  ADD COLUMN "foodProductId" TEXT,
  ADD COLUMN "genericFoodId" TEXT;

-- Backfill: copy old FK references into new columns and normalise itemType values
-- meal_items
UPDATE "meal_items" SET "foodProductId" = "foodId",     "itemType" = 'food_product' WHERE "itemType" = 'food';
UPDATE "meal_items" SET "genericFoodId" = "foodCategoryId", "itemType" = 'food_product' WHERE "itemType" = 'food_category';

-- pantry_items
UPDATE "pantry_items" SET "foodProductId" = "foodId",     "itemType" = 'food_product' WHERE "itemType" = 'food';
UPDATE "pantry_items" SET "genericFoodId" = "foodCategoryId", "itemType" = 'generic_food' WHERE "itemType" = 'food_category';

-- recipe_ingredients
UPDATE "recipe_ingredients" SET "foodProductId" = "foodId",     "itemType" = 'food_product' WHERE "itemType" = 'food';
UPDATE "recipe_ingredients" SET "genericFoodId" = "foodCategoryId", "itemType" = 'generic_food' WHERE "itemType" = 'food_category';

-- shopping_list_items
UPDATE "shopping_list_items" SET "foodProductId" = "foodId",     "itemType" = 'food_product' WHERE "itemType" = 'food';
UPDATE "shopping_list_items" SET "genericFoodId" = "foodCategoryId", "itemType" = 'generic_food' WHERE "itemType" = 'food_category';

-- food_waste
UPDATE "food_waste" SET "foodProductId" = "foodId"        WHERE "foodId" IS NOT NULL;
UPDATE "food_waste" SET "genericFoodId" = "foodCategoryId" WHERE "foodCategoryId" IS NOT NULL;

-- AlterTable (drop old columns now that data is backfilled)
ALTER TABLE "meal_items"
  DROP COLUMN "foodCategoryId",
  DROP COLUMN "foodId",
  ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "pantry_items"
  DROP COLUMN "foodCategoryId",
  DROP COLUMN "foodId",
  ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "recipe_ingredients"
  DROP COLUMN "foodCategoryId",
  DROP COLUMN "foodId",
  ALTER COLUMN "itemType" SET DEFAULT 'generic_food',
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shopping_list_items"
  DROP COLUMN "foodCategoryId",
  DROP COLUMN "foodId",
  ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "food_waste"
  DROP COLUMN "foodCategoryId",
  DROP COLUMN "foodId";

-- RenameTable: foods → food_products (preserves all rows and their IDs)
ALTER TABLE "foods" RENAME TO "food_products";

-- RenameTable: food_categories → generic_foods (preserves all NEVO rows and their IDs)
ALTER TABLE "food_categories" RENAME TO "generic_foods";

-- Rename constraints and indexes on food_products (were foods_*)
ALTER TABLE "food_products" RENAME CONSTRAINT "foods_pkey" TO "food_products_pkey";
ALTER INDEX "foods_barcode_key"        RENAME TO "food_products_barcode_key";
ALTER INDEX "foods_name_idx"           RENAME TO "food_products_name_idx";
ALTER INDEX "foods_createdAt_idx"      RENAME TO "food_products_createdAt_idx";
ALTER INDEX "foods_nutriscoreGrade_idx" RENAME TO "food_products_nutriscoreGrade_idx";
ALTER INDEX "foods_novaGroup_idx"      RENAME TO "food_products_novaGroup_idx";
ALTER INDEX "foods_shelfLifeId_idx"    RENAME TO "food_products_shelfLifeId_idx";

-- Rename constraints and indexes on generic_foods (were food_categories_*)
ALTER TABLE "generic_foods" RENAME CONSTRAINT "food_categories_pkey" TO "generic_foods_pkey";
ALTER INDEX "food_categories_nevoCode_key"  RENAME TO "generic_foods_nevoCode_key";
ALTER INDEX "food_categories_foodGroup_idx" RENAME TO "generic_foods_foodGroup_idx";
ALTER INDEX "food_categories_foodName_idx"  RENAME TO "generic_foods_foodName_idx";
ALTER INDEX "food_categories_nevoCode_idx"  RENAME TO "generic_foods_nevoCode_idx";
ALTER INDEX "food_categories_shelfLifeId_idx" RENAME TO "generic_foods_shelfLifeId_idx";

-- CreateIndex (junction tables only — catalog table indexes were renamed above)
CREATE INDEX "meal_items_foodProductId_idx" ON "meal_items"("foodProductId");

-- CreateIndex
CREATE INDEX "meal_items_genericFoodId_idx" ON "meal_items"("genericFoodId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_items_mealId_foodProductId_key" ON "meal_items"("mealId", "foodProductId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_items_mealId_genericFoodId_key" ON "meal_items"("mealId", "genericFoodId");

-- CreateIndex
CREATE INDEX "pantry_items_foodProductId_idx" ON "pantry_items"("foodProductId");

-- CreateIndex
CREATE INDEX "pantry_items_genericFoodId_idx" ON "pantry_items"("genericFoodId");

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_pantryId_foodProductId_key" ON "pantry_items"("pantryId", "foodProductId");

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_pantryId_genericFoodId_key" ON "pantry_items"("pantryId", "genericFoodId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodProductId_idx" ON "recipe_ingredients"("foodProductId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_genericFoodId_idx" ON "recipe_ingredients"("genericFoodId");

-- CreateIndex
CREATE INDEX "shopping_list_items_foodProductId_idx" ON "shopping_list_items"("foodProductId");

-- CreateIndex
CREATE INDEX "shopping_list_items_genericFoodId_idx" ON "shopping_list_items"("genericFoodId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_items_shoppingListId_foodProductId_key" ON "shopping_list_items"("shoppingListId", "foodProductId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_items_shoppingListId_genericFoodId_key" ON "shopping_list_items"("shoppingListId", "genericFoodId");

-- AddForeignKey (shelfLifeId FKs restored with new constraint names)
ALTER TABLE "food_products" ADD CONSTRAINT "food_products_shelfLifeId_fkey" FOREIGN KEY ("shelfLifeId") REFERENCES "food_shelf_life"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generic_foods" ADD CONSTRAINT "generic_foods_shelfLifeId_fkey" FOREIGN KEY ("shelfLifeId") REFERENCES "food_shelf_life"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_foodProductId_fkey" FOREIGN KEY ("foodProductId") REFERENCES "food_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_genericFoodId_fkey" FOREIGN KEY ("genericFoodId") REFERENCES "generic_foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_foodProductId_fkey" FOREIGN KEY ("foodProductId") REFERENCES "food_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_genericFoodId_fkey" FOREIGN KEY ("genericFoodId") REFERENCES "generic_foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_foodProductId_fkey" FOREIGN KEY ("foodProductId") REFERENCES "food_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_genericFoodId_fkey" FOREIGN KEY ("genericFoodId") REFERENCES "generic_foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodProductId_fkey" FOREIGN KEY ("foodProductId") REFERENCES "food_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_genericFoodId_fkey" FOREIGN KEY ("genericFoodId") REFERENCES "generic_foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "food_waste_foodProductId_idx" ON "food_waste"("foodProductId");

-- CreateIndex
CREATE INDEX "food_waste_genericFoodId_idx" ON "food_waste"("genericFoodId");

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_foodProductId_fkey" FOREIGN KEY ("foodProductId") REFERENCES "food_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_genericFoodId_fkey" FOREIGN KEY ("genericFoodId") REFERENCES "generic_foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

