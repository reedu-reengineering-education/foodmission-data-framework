-- Food facts get a short title so clients can list them by name.
--
-- Existing rows are backfilled from the body (truncated like the old quest
-- content label) so the NOT NULL constraint holds; the catalog seed then
-- overwrites them with the curated titles from food-facts.en.json.

-- AlterTable
ALTER TABLE "food_facts" ADD COLUMN "title" TEXT;

UPDATE "food_facts"
SET "title" = CASE
  WHEN length("body") > 80 THEN left("body", 77) || '...'
  ELSE "body"
END;

ALTER TABLE "food_facts" ALTER COLUMN "title" SET NOT NULL;
