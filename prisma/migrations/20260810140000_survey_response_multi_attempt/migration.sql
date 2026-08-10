-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN "attemptNumber" INTEGER;

-- Backfill existing rows as attempt 1
UPDATE "survey_responses" SET "attemptNumber" = 1 WHERE "attemptNumber" IS NULL;

-- Make NOT NULL
ALTER TABLE "survey_responses" ALTER COLUMN "attemptNumber" SET NOT NULL;

-- DropIndex
DROP INDEX "survey_responses_userId_surveyId_key";

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_userId_surveyId_attemptNumber_key" ON "survey_responses"("userId", "surveyId", "attemptNumber");
