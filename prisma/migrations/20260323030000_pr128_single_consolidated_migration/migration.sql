-- Consolidated migration for PR #128:
-- recipe system extension + meal taxonomy + dietary preferences + allergens enum + TypeOfMeal alignment.

-- CreateEnum
CREATE TYPE "MealCategory" AS ENUM (
  'ANIMAL_PROTEIN',
  'SEAFOOD',
  'PLANT_PROTEIN',
  'STARCH_GRAIN',
  'VEGGIES_FRUIT',
  'DAIRY',
  'MIXED_OTHER'
);

-- CreateEnum
CREATE TYPE "MealCourse" AS ENUM (
  'MAIN_DISH',
  'SIDE_SNACK',
  'DESSERT',
  'BEVERAGE',
  'SAUCE_OTHER'
);

-- CreateEnum
CREATE TYPE "Allergens" AS ENUM (
  'GLUTEN',
  'DAIRY',
  'PEANUTS',
  'TREE_NUTS',
  'SHELLFISH',
  'FISH',
  'EGGS',
  'SOY',
  'SESAME',
  'SULFITES',
  'MUSTARD',
  'NIGHTSHADES',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "DietaryLabel" AS ENUM (
  'VEGAN',
  'VEGETARIAN',
  'PESCATARIAN',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'NUT_FREE',
  'HALAL',
  'KOSHER'
);

-- Normalize legacy TypeOfMeal labels before enum recreation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TypeOfMeal' AND e.enumlabel = 'SPECIAL_DRINKS'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TypeOfMeal' AND e.enumlabel = 'DRINKS'
  ) THEN
    ALTER TYPE "TypeOfMeal" RENAME VALUE 'SPECIAL_DRINKS' TO 'DRINKS';
  END IF;
END
$$;

-- AlterEnum
BEGIN;
CREATE TYPE "TypeOfMeal_new" AS ENUM (
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'DRINKS',
  'OTHER'
);
ALTER TABLE "meal_logs"
  ALTER COLUMN "typeOfMeal"
  TYPE "TypeOfMeal_new"
  USING ("typeOfMeal"::text::"TypeOfMeal_new");
ALTER TYPE "TypeOfMeal" RENAME TO "TypeOfMeal_old";
ALTER TYPE "TypeOfMeal_new" RENAME TO "TypeOfMeal";
DROP TYPE "TypeOfMeal_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_mealId_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_userId_fkey";

-- DropIndex
DROP INDEX "Meal_mealType_idx";

-- DropIndex
DROP INDEX "recipes_mealId_idx";

-- AlterTable
ALTER TABLE "foods" ADD COLUMN "vitaminD" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "food_categories"
  ADD COLUMN "salt" DOUBLE PRECISION,
  ADD COLUMN "vitaminA" DOUBLE PRECISION;

-- Backfill FoodCategory.vitaminA and salt.
UPDATE "food_categories"
SET "vitaminA" = "vitaminARae"
WHERE "vitaminARae" IS NOT NULL;

UPDATE "food_categories"
SET "salt" = "sodium" * 2.5 / 1000
WHERE "sodium" IS NOT NULL;

-- AlterTable
ALTER TABLE "Meal"
  DROP COLUMN "mealType",
  ADD COLUMN "dietaryLabels" "DietaryLabel"[] DEFAULT ARRAY[]::"DietaryLabel"[],
  ADD COLUMN "mealCategories" "MealCategory"[] DEFAULT ARRAY[]::"MealCategory"[],
  ADD COLUMN "mealCourse" "MealCourse",
  ADD COLUMN "recipeId" TEXT;

-- AlterTable (keep recipe allergen data via mapped enum conversion)
ALTER TABLE "recipes"
  DROP COLUMN "mealId",
  ADD COLUMN "category" TEXT,
  ADD COLUMN "cuisineType" TEXT,
  ADD COLUMN "dietaryLabels" TEXT[],
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "videoUrl" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "recipes" ADD COLUMN "allergens_enum" "Allergens"[];

UPDATE "recipes"
SET "allergens_enum" = ARRAY(
  SELECT CASE lower(x)
    WHEN 'gluten' THEN 'GLUTEN'::"Allergens"
    WHEN 'milk' THEN 'DAIRY'::"Allergens"
    WHEN 'eggs' THEN 'EGGS'::"Allergens"
    WHEN 'fish' THEN 'FISH'::"Allergens"
    WHEN 'crustaceans' THEN 'SHELLFISH'::"Allergens"
    WHEN 'molluscs' THEN 'SHELLFISH'::"Allergens"
    WHEN 'nuts' THEN 'TREE_NUTS'::"Allergens"
    WHEN 'peanuts' THEN 'PEANUTS'::"Allergens"
    WHEN 'soy' THEN 'SOY'::"Allergens"
    WHEN 'mustard' THEN 'MUSTARD'::"Allergens"
    WHEN 'sesame' THEN 'SESAME'::"Allergens"
    WHEN 'sulphites' THEN 'SULFITES'::"Allergens"
    WHEN 'nightshades' THEN 'NIGHTSHADES'::"Allergens"
    ELSE 'OTHER'::"Allergens"
  END
  FROM unnest(COALESCE("allergens"::text[], ARRAY[]::text[])) AS x
);

ALTER TABLE "recipes" DROP COLUMN "allergens";
ALTER TABLE "recipes" RENAME COLUMN "allergens_enum" TO "allergens";

-- DropEnum
DROP TYPE "MealType";

-- CreateTable
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
ALTER TABLE "Meal"
  ADD CONSTRAINT "Meal_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_foodId_fkey"
  FOREIGN KEY ("foodId") REFERENCES "foods"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_foodCategoryId_fkey"
  FOREIGN KEY ("foodCategoryId") REFERENCES "food_categories"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
