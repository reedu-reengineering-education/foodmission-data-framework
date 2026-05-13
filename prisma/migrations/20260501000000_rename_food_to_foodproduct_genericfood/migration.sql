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
  - You are about to drop the `food_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `foods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `foodId` on the `food_waste` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategoryId` on the `food_waste` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mealId,foodProductId]` on the table `meal_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mealId,genericFoodId]` on the table `meal_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pantryId,foodProductId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pantryId,genericFoodId]` on the table `pantry_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shoppingListId,foodProductId]` on the table `shopping_list_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shoppingListId,genericFoodId]` on the table `shopping_list_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
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

-- AlterTable
ALTER TABLE "meal_items" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
ADD COLUMN     "foodProductId" TEXT,
ADD COLUMN     "genericFoodId" TEXT,
ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "pantry_items" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
ADD COLUMN     "foodProductId" TEXT,
ADD COLUMN     "genericFoodId" TEXT,
ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "recipe_ingredients" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
ADD COLUMN     "foodProductId" TEXT,
ADD COLUMN     "genericFoodId" TEXT,
ALTER COLUMN "itemType" SET DEFAULT 'generic_food',
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shopping_list_items" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
ADD COLUMN     "foodProductId" TEXT,
ADD COLUMN     "genericFoodId" TEXT,
ALTER COLUMN "itemType" SET DEFAULT 'food_product';

-- AlterTable
ALTER TABLE "food_waste" DROP COLUMN "foodCategoryId",
DROP COLUMN "foodId",
ADD COLUMN     "foodProductId" TEXT,
ADD COLUMN     "genericFoodId" TEXT;

-- DropTable
DROP TABLE "food_categories";

-- DropTable
DROP TABLE "foods";

-- CreateTable
CREATE TABLE "food_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "brands" TEXT,
    "categories" TEXT[],
    "labels" TEXT[],
    "quantity" TEXT,
    "servingSize" TEXT,
    "ingredientsText" TEXT,
    "allergens" TEXT[],
    "traces" TEXT[],
    "countries" TEXT[],
    "origins" TEXT,
    "manufacturingPlaces" TEXT,
    "imageUrl" TEXT,
    "imageFrontUrl" TEXT,
    "nutritionDataPer" TEXT,
    "energyKcal" DOUBLE PRECISION,
    "energyKj" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "transFat" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "carbohydrates" DOUBLE PRECISION,
    "sugars" DOUBLE PRECISION,
    "addedSugars" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "proteins" DOUBLE PRECISION,
    "salt" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "vitaminA" DOUBLE PRECISION,
    "vitaminC" DOUBLE PRECISION,
    "vitaminD" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "magnesium" DOUBLE PRECISION,
    "zinc" DOUBLE PRECISION,
    "nutrimentsRaw" JSONB,
    "nutriscoreGrade" TEXT,
    "nutriscoreScore" INTEGER,
    "novaGroup" INTEGER,
    "ecoscoreGrade" TEXT,
    "carbonFootprint" DOUBLE PRECISION,
    "nutrientLevels" JSONB,
    "isVegan" BOOLEAN,
    "isVegetarian" BOOLEAN,
    "isPalmOilFree" BOOLEAN,
    "ingredientsAnalysisTags" TEXT[],
    "packagingTags" TEXT[],
    "packagingMaterials" TEXT[],
    "packagingRecycling" TEXT[],
    "packagingText" TEXT,
    "completeness" DOUBLE PRECISION,
    "shelfLifeId" TEXT,

    CONSTRAINT "food_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generic_foods" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nevoVersion" TEXT NOT NULL,
    "foodGroup" TEXT NOT NULL,
    "nevoCode" INTEGER NOT NULL,
    "foodName" TEXT NOT NULL,
    "synonym" TEXT,
    "quantity" TEXT,
    "containsTracesOf" TEXT,
    "isFortifiedWith" TEXT,
    "energyKj" DOUBLE PRECISION,
    "energyKcal" DOUBLE PRECISION,
    "water" DOUBLE PRECISION,
    "proteins" DOUBLE PRECISION,
    "proteinsPlant" DOUBLE PRECISION,
    "proteinsAnimal" DOUBLE PRECISION,
    "nitrogenTotal" DOUBLE PRECISION,
    "tryptophan" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "carbohydrates" DOUBLE PRECISION,
    "sugars" DOUBLE PRECISION,
    "addedSugars" DOUBLE PRECISION,
    "starch" DOUBLE PRECISION,
    "polyols" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "alcohol" DOUBLE PRECISION,
    "organicAcids" DOUBLE PRECISION,
    "ash" DOUBLE PRECISION,
    "fattyAcidsTotal" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "monoUnsaturatedFat" DOUBLE PRECISION,
    "polyUnsaturatedFat" DOUBLE PRECISION,
    "omega3Fat" DOUBLE PRECISION,
    "omega6Fat" DOUBLE PRECISION,
    "transFat" DOUBLE PRECISION,
    "chloride" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "salt" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "magnesium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "ironHaem" DOUBLE PRECISION,
    "ironNonHaem" DOUBLE PRECISION,
    "copper" DOUBLE PRECISION,
    "selenium" DOUBLE PRECISION,
    "zinc" DOUBLE PRECISION,
    "iodine" DOUBLE PRECISION,
    "vitaminA" DOUBLE PRECISION,
    "vitaminARae" DOUBLE PRECISION,
    "vitaminARe" DOUBLE PRECISION,
    "retinol" DOUBLE PRECISION,
    "betaCarotene" DOUBLE PRECISION,
    "alphaCarotene" DOUBLE PRECISION,
    "lutein" DOUBLE PRECISION,
    "zeaxanthin" DOUBLE PRECISION,
    "betaCryptoxanthin" DOUBLE PRECISION,
    "lycopene" DOUBLE PRECISION,
    "vitaminD" DOUBLE PRECISION,
    "hydroxyCholecalciferol" DOUBLE PRECISION,
    "cholecalciferol" DOUBLE PRECISION,
    "ergocalciferol" DOUBLE PRECISION,
    "vitaminE" DOUBLE PRECISION,
    "alphaTocopherol" DOUBLE PRECISION,
    "betaTocopherol" DOUBLE PRECISION,
    "deltaTocopherol" DOUBLE PRECISION,
    "gammaTocopherol" DOUBLE PRECISION,
    "vitaminK" DOUBLE PRECISION,
    "vitaminK1" DOUBLE PRECISION,
    "vitaminK2" DOUBLE PRECISION,
    "thiamin" DOUBLE PRECISION,
    "riboflavin" DOUBLE PRECISION,
    "vitaminB6" DOUBLE PRECISION,
    "vitaminB12" DOUBLE PRECISION,
    "niacinEquivalents" DOUBLE PRECISION,
    "niacin" DOUBLE PRECISION,
    "folateTotal" DOUBLE PRECISION,
    "folateFood" DOUBLE PRECISION,
    "folicAcid" DOUBLE PRECISION,
    "vitaminC" DOUBLE PRECISION,
    "fa4_0" DOUBLE PRECISION,
    "fa6_0" DOUBLE PRECISION,
    "fa8_0" DOUBLE PRECISION,
    "fa10_0" DOUBLE PRECISION,
    "fa11_0" DOUBLE PRECISION,
    "fa12_0" DOUBLE PRECISION,
    "fa13_0" DOUBLE PRECISION,
    "fa14_0" DOUBLE PRECISION,
    "fa15_0" DOUBLE PRECISION,
    "fa16_0" DOUBLE PRECISION,
    "fa17_0" DOUBLE PRECISION,
    "fa18_0" DOUBLE PRECISION,
    "fa19_0" DOUBLE PRECISION,
    "fa20_0" DOUBLE PRECISION,
    "fa21_0" DOUBLE PRECISION,
    "fa22_0" DOUBLE PRECISION,
    "fa23_0" DOUBLE PRECISION,
    "fa24_0" DOUBLE PRECISION,
    "fa25_0" DOUBLE PRECISION,
    "fa26_0" DOUBLE PRECISION,
    "saturatedFatRemainder" DOUBLE PRECISION,
    "fa10_1cis" DOUBLE PRECISION,
    "fa12_1cis" DOUBLE PRECISION,
    "fa14_1cis" DOUBLE PRECISION,
    "fa16_1cis" DOUBLE PRECISION,
    "fa18_1cis" DOUBLE PRECISION,
    "fa20_1cis" DOUBLE PRECISION,
    "fa22_1cis" DOUBLE PRECISION,
    "fa24_1cis" DOUBLE PRECISION,
    "monoUnsaturatedFatRemainder" DOUBLE PRECISION,
    "fa18_2cn6" DOUBLE PRECISION,
    "fa18_2cn9" DOUBLE PRECISION,
    "fa18_2ct" DOUBLE PRECISION,
    "fa18_2tc" DOUBLE PRECISION,
    "fa18_2r" DOUBLE PRECISION,
    "fa18_3cn3" DOUBLE PRECISION,
    "fa18_3cn6" DOUBLE PRECISION,
    "fa18_4cn3" DOUBLE PRECISION,
    "fa20_2cn6" DOUBLE PRECISION,
    "fa20_3cn9" DOUBLE PRECISION,
    "fa20_3cn6" DOUBLE PRECISION,
    "fa20_3cn3" DOUBLE PRECISION,
    "fa20_4cn6" DOUBLE PRECISION,
    "fa20_4cn3" DOUBLE PRECISION,
    "fa20_5cn3" DOUBLE PRECISION,
    "fa21_5cn3" DOUBLE PRECISION,
    "fa22_2cn6" DOUBLE PRECISION,
    "fa22_2cn3" DOUBLE PRECISION,
    "fa22_3cn3" DOUBLE PRECISION,
    "fa22_4cn6" DOUBLE PRECISION,
    "fa22_5cn6" DOUBLE PRECISION,
    "fa22_5cn3" DOUBLE PRECISION,
    "fa22_6cn3" DOUBLE PRECISION,
    "fa24_2cn6" DOUBLE PRECISION,
    "polyUnsaturatedFatRemainder" DOUBLE PRECISION,
    "fa10_1trans" DOUBLE PRECISION,
    "fa12_1trans" DOUBLE PRECISION,
    "fa14_1trans" DOUBLE PRECISION,
    "fa16_1trans" DOUBLE PRECISION,
    "fa18_1trans" DOUBLE PRECISION,
    "fa18_2ttN6" DOUBLE PRECISION,
    "fa18_3tttN3" DOUBLE PRECISION,
    "fa20_1trans" DOUBLE PRECISION,
    "fa20_2tt" DOUBLE PRECISION,
    "fa22_1trans" DOUBLE PRECISION,
    "fa24_1trans" DOUBLE PRECISION,
    "transFatRemainder" DOUBLE PRECISION,
    "fattyAcidsUnidentified" DOUBLE PRECISION,
    "shelfLifeId" TEXT,

    CONSTRAINT "generic_foods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_products_barcode_key" ON "food_products"("barcode");

-- CreateIndex
CREATE INDEX "food_products_name_idx" ON "food_products"("name");

-- CreateIndex
CREATE INDEX "food_products_createdAt_idx" ON "food_products"("createdAt");

-- CreateIndex
CREATE INDEX "food_products_nutriscoreGrade_idx" ON "food_products"("nutriscoreGrade");

-- CreateIndex
CREATE INDEX "food_products_novaGroup_idx" ON "food_products"("novaGroup");

-- CreateIndex
CREATE INDEX "food_products_shelfLifeId_idx" ON "food_products"("shelfLifeId");

-- CreateIndex
CREATE UNIQUE INDEX "generic_foods_nevoCode_key" ON "generic_foods"("nevoCode");

-- CreateIndex
CREATE INDEX "generic_foods_foodGroup_idx" ON "generic_foods"("foodGroup");

-- CreateIndex
CREATE INDEX "generic_foods_foodName_idx" ON "generic_foods"("foodName");

-- CreateIndex
CREATE INDEX "generic_foods_nevoCode_idx" ON "generic_foods"("nevoCode");

-- CreateIndex
CREATE INDEX "generic_foods_shelfLifeId_idx" ON "generic_foods"("shelfLifeId");

-- CreateIndex
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

-- AddForeignKey
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
