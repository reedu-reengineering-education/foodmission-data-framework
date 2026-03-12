-- AlterTable: Food - add vitaminD for recipe nutrition aggregation
ALTER TABLE "foods" ADD COLUMN "vitaminD" DOUBLE PRECISION;

-- AlterTable: FoodCategory - add vitaminA and salt for same field names as Food
ALTER TABLE "food_categories" ADD COLUMN "salt" DOUBLE PRECISION,
ADD COLUMN "vitaminA" DOUBLE PRECISION;

-- Backfill FoodCategory.vitaminA from vitaminARae (same units µg)
UPDATE "food_categories" SET "vitaminA" = "vitaminARae" WHERE "vitaminARae" IS NOT NULL;

-- Backfill FoodCategory.salt from sodium (sodium in mg -> salt in g: salt ≈ sodium * 2.5 / 1000)
UPDATE "food_categories" SET "salt" = "sodium" * 2.5 / 1000 WHERE "sodium" IS NOT NULL;
