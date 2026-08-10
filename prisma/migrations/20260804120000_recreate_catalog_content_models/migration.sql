-- Recreate educational/gamification catalog content models (Task 3.3 shape).
-- Drops Knowledge*; recreates missions/challenges; adds FoodFact, Quiz, Quest, MicroLearning.

-- CreateEnum
CREATE TYPE "ContentLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "QuestContentType" AS ENUM ('MISSION', 'CHALLENGE', 'FOOD_FACT', 'QUIZ', 'MICRO_LEARNING');

-- DropTable (knowledge first — dependents, then parent)
DROP TABLE IF EXISTS "user_knowledge_progress" CASCADE;
DROP TABLE IF EXISTS "knowledge" CASCADE;

-- DropTable (mission/challenge progress then catalogs)
DROP TABLE IF EXISTS "mission_progress" CASCADE;
DROP TABLE IF EXISTS "challenge_progress" CASCADE;
DROP TABLE IF EXISTS "missions" CASCADE;
DROP TABLE IF EXISTS "challenges" CASCADE;

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "topicId" TEXT,
    "level" "ContentLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "health" BOOLEAN NOT NULL DEFAULT false,
    "foodChoice" BOOLEAN NOT NULL DEFAULT false,
    "foodWaste" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_progress" (
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "mission_progress_pkey" PRIMARY KEY ("userId","missionId")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "topicId" TEXT,
    "level" "ContentLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "health" BOOLEAN NOT NULL DEFAULT false,
    "foodChoice" BOOLEAN NOT NULL DEFAULT false,
    "foodWaste" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("userId","challengeId")
);

-- CreateTable
CREATE TABLE "food_facts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT,
    "level" "ContentLevel" NOT NULL,
    "health" BOOLEAN NOT NULL DEFAULT false,
    "foodChoice" BOOLEAN NOT NULL DEFAULT false,
    "foodWaste" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT,
    "level" "ContentLevel" NOT NULL,
    "health" BOOLEAN NOT NULL DEFAULT false,
    "foodChoice" BOOLEAN NOT NULL DEFAULT false,
    "foodWaste" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_options" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" "ContentLevel" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_items" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "contentType" "QuestContentType" NOT NULL,
    "contentCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quest_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_progress" (
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("userId","questId")
);

-- CreateTable
CREATE TABLE "micro_learnings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dimensionId" TEXT,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tips" TEXT,
    "media" JSONB NOT NULL DEFAULT '{}',
    "level" "ContentLevel",
    "health" BOOLEAN NOT NULL DEFAULT false,
    "foodChoice" BOOLEAN NOT NULL DEFAULT false,
    "foodWaste" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_learnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "missions_code_key" ON "missions"("code");

-- CreateIndex
CREATE INDEX "missions_dimensionId_idx" ON "missions"("dimensionId");

-- CreateIndex
CREATE INDEX "missions_topicId_idx" ON "missions"("topicId");

-- CreateIndex
CREATE INDEX "missions_level_idx" ON "missions"("level");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");

-- CreateIndex
CREATE INDEX "challenges_dimensionId_idx" ON "challenges"("dimensionId");

-- CreateIndex
CREATE INDEX "challenges_topicId_idx" ON "challenges"("topicId");

-- CreateIndex
CREATE INDEX "challenges_level_idx" ON "challenges"("level");

-- CreateIndex
CREATE UNIQUE INDEX "food_facts_code_key" ON "food_facts"("code");

-- CreateIndex
CREATE INDEX "food_facts_topicId_idx" ON "food_facts"("topicId");

-- CreateIndex
CREATE INDEX "food_facts_level_idx" ON "food_facts"("level");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_code_key" ON "quizzes"("code");

-- CreateIndex
CREATE INDEX "quizzes_topicId_idx" ON "quizzes"("topicId");

-- CreateIndex
CREATE INDEX "quizzes_level_idx" ON "quizzes"("level");

-- CreateIndex
CREATE INDEX "quiz_options_quizId_idx" ON "quiz_options"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_options_quizId_label_key" ON "quiz_options"("quizId", "label");

-- CreateIndex
CREATE INDEX "quiz_progress_userId_idx" ON "quiz_progress"("userId");

-- CreateIndex
CREATE INDEX "quiz_progress_quizId_idx" ON "quiz_progress"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_progress_userId_quizId_key" ON "quiz_progress"("userId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quests_code_key" ON "quests"("code");

-- CreateIndex
CREATE INDEX "quests_dimensionId_idx" ON "quests"("dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "quests_dimensionId_level_key" ON "quests"("dimensionId", "level");

-- CreateIndex
CREATE INDEX "quest_items_questId_idx" ON "quest_items"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "quest_items_questId_contentType_contentCode_key" ON "quest_items"("questId", "contentType", "contentCode");

-- CreateIndex
CREATE UNIQUE INDEX "micro_learnings_code_key" ON "micro_learnings"("code");

-- CreateIndex
CREATE INDEX "micro_learnings_dimensionId_idx" ON "micro_learnings"("dimensionId");

-- CreateIndex
CREATE INDEX "micro_learnings_topicId_idx" ON "micro_learnings"("topicId");

-- CreateIndex
CREATE INDEX "micro_learnings_level_idx" ON "micro_learnings"("level");

-- CreateIndex
CREATE INDEX "users_currentQuestId_idx" ON "users"("currentQuestId");

-- CreateIndex
CREATE INDEX "user_groups_currentQuestId_idx" ON "user_groups"("currentQuestId");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_facts" ADD CONSTRAINT "food_facts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_progress" ADD CONSTRAINT "quiz_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_progress" ADD CONSTRAINT "quiz_progress_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_progress" ADD CONSTRAINT "quiz_progress_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "quiz_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_items" ADD CONSTRAINT "quest_items_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_learnings" ADD CONSTRAINT "micro_learnings_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_learnings" ADD CONSTRAINT "micro_learnings_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_currentQuestId_fkey" FOREIGN KEY ("currentQuestId") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_currentQuestId_fkey" FOREIGN KEY ("currentQuestId") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
