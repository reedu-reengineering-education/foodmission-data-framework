-- CreateTable
CREATE TABLE "knowledge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_knowledge_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_knowledge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_userId_idx" ON "knowledge"("userId");

-- CreateIndex
CREATE INDEX "knowledge_available_idx" ON "knowledge"("available");

-- CreateIndex
CREATE INDEX "user_knowledge_progress_userId_idx" ON "user_knowledge_progress"("userId");

-- CreateIndex
CREATE INDEX "user_knowledge_progress_knowledgeId_idx" ON "user_knowledge_progress"("knowledgeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_knowledge_progress_userId_knowledgeId_key" ON "user_knowledge_progress"("userId", "knowledgeId");

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_knowledge_progress" ADD CONSTRAINT "user_knowledge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_knowledge_progress" ADD CONSTRAINT "user_knowledge_progress_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
