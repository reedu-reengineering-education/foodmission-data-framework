-- Daily analytics batches no longer publish themselves (runDailyAggregation
-- now stops at STAGING). Move the batches the cron auto-published as
-- 'system' back to STAGING so an admin reviews them before they are public
-- again. Batches an admin published, and SUPERSEDED history, are untouched.

UPDATE "meal_log_analytics_batches"
SET "status" = 'STAGING',
    "publishedAt" = NULL,
    "publishedBy" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PUBLISHED'
  AND "publishedBy" = 'system';

UPDATE "shopping_list_analytics_batches"
SET "status" = 'STAGING',
    "publishedAt" = NULL,
    "publishedBy" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PUBLISHED'
  AND "publishedBy" = 'system';
