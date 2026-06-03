-- Unify MealLogAnalyticsBatchStatus and ShoppingListAnalyticsBatchStatus
-- into a single shared AnalyticsBatchStatus enum.
-- Both enums had identical values, so no data conversion is needed beyond
-- casting through text.

-- 1. Create the new unified enum
CREATE TYPE "AnalyticsBatchStatus" AS ENUM (
  'STAGING',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'SUPERSEDED'
);

-- 2. Migrate meal_log_analytics_batches
ALTER TABLE "meal_log_analytics_batches"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "meal_log_analytics_batches"
  ALTER COLUMN "status" TYPE "AnalyticsBatchStatus"
  USING "status"::text::"AnalyticsBatchStatus";
ALTER TABLE "meal_log_analytics_batches"
  ALTER COLUMN "status" SET DEFAULT 'STAGING'::"AnalyticsBatchStatus";

-- 3. Migrate shopping_list_analytics_batches
ALTER TABLE "shopping_list_analytics_batches"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "shopping_list_analytics_batches"
  ALTER COLUMN "status" TYPE "AnalyticsBatchStatus"
  USING "status"::text::"AnalyticsBatchStatus";
ALTER TABLE "shopping_list_analytics_batches"
  ALTER COLUMN "status" SET DEFAULT 'STAGING'::"AnalyticsBatchStatus";

-- 4. Drop the old domain-specific enums
DROP TYPE "MealLogAnalyticsBatchStatus";
DROP TYPE "ShoppingListAnalyticsBatchStatus";
