-- Add meal taxonomy enums and fields to Meal

-- CreateEnum
CREATE TYPE "MealCategory" AS ENUM (
  'MEAT',
  'POULTRY',
  'SEAFOOD',
  'PASTA_NOODLES',
  'GRAINS_STARCHES',
  'LEGUMES_BEANS',
  'VEGETABLE_BASED',
  'FRUIT_BASED',
  'EGG_BASED',
  'DAIRY_BASED',
  'PLANT_PROTEIN',
  'MIXED',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "MealCourse" AS ENUM (
  'STARTER',
  'MAIN',
  'SIDE',
  'DESSERT',
  'SNACK',
  'BEVERAGE',
  'SAUCE_CONDIMENT',
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

-- AlterTable: Meal
ALTER TABLE "Meal"
ADD COLUMN     "mealCategories" "MealCategory"[] NOT NULL DEFAULT ARRAY[]::"MealCategory"[],
ADD COLUMN     "mealCourse" "MealCourse",
ADD COLUMN     "dietaryLabels" "DietaryLabel"[] NOT NULL DEFAULT ARRAY[]::"DietaryLabel"[];

-- Rename MealCategory enum value PRODUCE -> VEGGIES_FRUIT (backward compatible)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MealCategory'
      AND e.enumlabel = 'PRODUCE'
  ) THEN
    ALTER TYPE "MealCategory" RENAME VALUE 'PRODUCE' TO 'VEGGIES_FRUIT';
  END IF;
END
$$;

