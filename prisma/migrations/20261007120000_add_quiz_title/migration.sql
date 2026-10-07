-- Quizzes get a short title so clients can list them by name.
--
-- Existing rows are backfilled from the question (truncated to 80 chars) so
-- the NOT NULL constraint holds; the catalog seed then overwrites them with
-- the curated titles from quizzes.en.json.

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN "title" TEXT;

UPDATE "quizzes"
SET "title" = CASE
  WHEN length("question") > 80 THEN left("question", 77) || '...'
  ELSE "question"
END;

ALTER TABLE "quizzes" ALTER COLUMN "title" SET NOT NULL;
