-- Remove misleading shopping-list nutrition/per-100g analytics. Shopping lists
-- represent planned items, not consumed meals, so nutrition remains meal-log only.
DROP TABLE IF EXISTS "shopping_list_analytics_cross_dim_nutrition";
DROP TABLE IF EXISTS "shopping_list_analytics_demographic_nutrition";
DROP TABLE IF EXISTS "shopping_list_analytics_nutrition_profile";

-- Keep first-class shopping-list classification and persist top-level
-- ultra-processed percentiles alongside the existing sustainability-backed row.
ALTER TABLE "shopping_list_analytics_sustainability"
ADD COLUMN "p25UltraProcessedPct" DOUBLE PRECISION,
ADD COLUMN "p50UltraProcessedPct" DOUBLE PRECISION,
ADD COLUMN "p75UltraProcessedPct" DOUBLE PRECISION;
