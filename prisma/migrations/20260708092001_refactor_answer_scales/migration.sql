-- DropForeignKey
ALTER TABLE "question_responses" DROP CONSTRAINT "question_responses_selectedAnswerId_fkey";

-- AlterTable
ALTER TABLE "answer_options" ADD COLUMN     "scaleId" TEXT,
ALTER COLUMN "questionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "question_responses" ADD COLUMN     "dateResponse" TIMESTAMP(3),
ADD COLUMN     "numberResponse" INTEGER,
ADD COLUMN     "textResponse" TEXT,
ALTER COLUMN "selectedAnswerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "scaleId" TEXT;

-- CreateTable
CREATE TABLE "answer_scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_scales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "answer_scales_name_key" ON "answer_scales"("name");

-- CreateIndex
CREATE INDEX "answer_options_scaleId_idx" ON "answer_options"("scaleId");

-- CreateIndex
CREATE INDEX "questions_scaleId_idx" ON "questions"("scaleId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "answer_scales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "answer_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_selectedAnswerId_fkey" FOREIGN KEY ("selectedAnswerId") REFERENCES "answer_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
