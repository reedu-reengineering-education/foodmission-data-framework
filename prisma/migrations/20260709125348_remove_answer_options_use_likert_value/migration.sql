/*
  Warnings:

  - You are about to drop the column `dateResponse` on the `question_responses` table. All the data in the column will be lost.
  - You are about to drop the column `numberResponse` on the `question_responses` table. All the data in the column will be lost.
  - You are about to drop the column `selectedAnswerId` on the `question_responses` table. All the data in the column will be lost.
  - You are about to drop the column `textResponse` on the `question_responses` table. All the data in the column will be lost.
  - You are about to drop the column `scaleId` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `answer_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `answer_scales` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `value` to the `question_responses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "answer_options" DROP CONSTRAINT "answer_options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "answer_options" DROP CONSTRAINT "answer_options_scaleId_fkey";

-- DropForeignKey
ALTER TABLE "question_responses" DROP CONSTRAINT "question_responses_selectedAnswerId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_scaleId_fkey";

-- DropIndex
DROP INDEX "question_responses_selectedAnswerId_idx";

-- DropIndex
DROP INDEX "questions_scaleId_idx";

-- AlterTable
ALTER TABLE "question_responses" DROP COLUMN "dateResponse",
DROP COLUMN "numberResponse",
DROP COLUMN "selectedAnswerId",
DROP COLUMN "textResponse",
ADD COLUMN     "value" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "scaleId";

-- DropTable
DROP TABLE "answer_options";

-- DropTable
DROP TABLE "answer_scales";
