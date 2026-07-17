-- CreateTable
CREATE TABLE "sustainability_dimensions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sustainability_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sustainability_topics" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sustainability_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sustainability_dimensions_code_key" ON "sustainability_dimensions"("code");

-- CreateIndex
CREATE INDEX "sustainability_dimensions_sortOrder_idx" ON "sustainability_dimensions"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "sustainability_topics_code_key" ON "sustainability_topics"("code");

-- CreateIndex
CREATE INDEX "sustainability_topics_dimensionId_idx" ON "sustainability_topics"("dimensionId");

-- CreateIndex
CREATE INDEX "sustainability_topics_sortOrder_idx" ON "sustainability_topics"("sortOrder");

-- AddForeignKey
ALTER TABLE "sustainability_topics" ADD CONSTRAINT "sustainability_topics_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "sustainability_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
