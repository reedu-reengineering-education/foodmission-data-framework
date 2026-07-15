-- Add stable slugs for knowledge i18n keys

ALTER TABLE "knowledge" ADD COLUMN "slug" TEXT;

UPDATE "knowledge"
SET "slug" = CASE
  WHEN "title" = 'Nutrition Basics' THEN 'nutrition-basics'
  WHEN "title" = 'Food Safety 101' THEN 'food-safety-101'
  ELSE trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g'))
END
WHERE "slug" IS NULL;

ALTER TABLE "knowledge" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "knowledge_slug_key" ON "knowledge"("slug");
