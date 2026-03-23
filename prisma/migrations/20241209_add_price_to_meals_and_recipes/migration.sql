-- Ensure enums exist (PostgreSQL does not support IF NOT EXISTS for TYPE in all versions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeOfMeal') THEN
    CREATE TYPE "TypeOfMeal" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DRINKS', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MealType') THEN
    CREATE TYPE "MealType" AS ENUM ('SALAD', 'MEAT', 'PASTA', 'RICE', 'VEGAN');
  END IF;
END $$;

-- Keep TypeOfMeal enum labels aligned with current schema.
-- (Needed for DBs where the enum was created with 'SPECIAL_DRINKS' but schema now uses 'DRINKS' + 'OTHER'.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeOfMeal') THEN
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

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'TypeOfMeal' AND e.enumlabel = 'OTHER'
    ) THEN
      ALTER TYPE "TypeOfMeal" ADD VALUE 'OTHER';
    END IF;
  END IF;
END
$$;

-- Add optional price fields to meals and recipes if columns exist; otherwise assume base schema from init migration
ALTER TABLE IF EXISTS "meals" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "recipes" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;

-- Ensure FK rename from dishId -> mealId for legacy DBs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'dishId'
  ) THEN
    ALTER TABLE "recipes" RENAME COLUMN "dishId" TO "mealId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meal_logs' AND column_name = 'dishId'
  ) THEN
    ALTER TABLE "meal_logs" RENAME COLUMN "dishId" TO "mealId";
  END IF;
END $$;
