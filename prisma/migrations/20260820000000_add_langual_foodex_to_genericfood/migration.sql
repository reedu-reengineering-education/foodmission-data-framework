-- Migration: add LanguaL and FoodEx2 arrays to generic_foods
-- Adds two text[] columns with default empty arrays so existing rows get an empty array

ALTER TABLE "generic_foods"
  ADD COLUMN "langualCodes" TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

ALTER TABLE "generic_foods"
  ADD COLUMN "foodex2Codes" TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;
