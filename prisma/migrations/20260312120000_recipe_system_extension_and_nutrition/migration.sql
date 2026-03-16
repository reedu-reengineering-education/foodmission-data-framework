/*
  Recipe system extension (TheMealDB integration) and nutrition fields.

  - Meal: drop mealType, add recipeId (optional link to Recipe).
  - Recipe: drop mealId, add externalId, source, imageUrl, videoUrl, category, cuisineType,
    isPublic, dietaryLabels; userId nullable for system recipes. No ingredients JSONB
    (replaced by recipe_ingredients table).
  - RecipeIngredient: new table linking recipes to Food/FoodCategory.
  - Food: add vitaminD. FoodCategory: add salt, vitaminA (with backfill).
*/
-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_mealId_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_userId_fkey";

-- DropIndex
DROP INDEX "Meal_mealType_idx";

-- DropIndex
DROP INDEX "recipes_mealId_idx";

-- AlterTable Meal
ALTER TABLE "Meal" DROP COLUMN "mealType",
ADD COLUMN     "recipeId" TEXT;

-- AlterTable recipes (no ingredients JSONB; recipe_ingredients table replaces it)
ALTER TABLE "recipes" DROP COLUMN "mealId",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cuisineType" TEXT,
ADD COLUMN     "dietaryLabels" TEXT[],
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
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

-- CreateTable recipe_ingredients
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "measure" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "itemType" TEXT NOT NULL DEFAULT 'food_category',
    "foodId" TEXT,
    "foodCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodCategoryId_idx" ON "recipe_ingredients"("foodCategoryId");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Food - add vitaminD for recipe nutrition aggregation
ALTER TABLE "foods" ADD COLUMN "vitaminD" DOUBLE PRECISION;

-- AlterTable: FoodCategory - add vitaminA and salt for same field names as Food
ALTER TABLE "food_categories" ADD COLUMN "salt" DOUBLE PRECISION,
ADD COLUMN "vitaminA" DOUBLE PRECISION;

-- Backfill FoodCategory.vitaminA from vitaminARae (same units µg)
UPDATE "food_categories" SET "vitaminA" = "vitaminARae" WHERE "vitaminARae" IS NOT NULL;

-- Backfill FoodCategory.salt from sodium (sodium in mg -> salt in g: salt ≈ sodium * 2.5 / 1000)
UPDATE "food_categories" SET "salt" = "sodium" * 2.5 / 1000 WHERE "sodium" IS NOT NULL;
