-- AlterTable
ALTER TABLE "questions" ADD COLUMN "key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "questions_key_key" ON "questions"("key");
