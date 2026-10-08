-- One learning level per user and dimension, inferred from the onboarding
-- survey and raised once every quest at the current level in that dimension
-- is completed.
-- New empty table, no backfill.

-- CreateTable
CREATE TABLE "user_dimension_levels" (
    "userId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" "ContentLevel" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dimension_levels_pkey" PRIMARY KEY ("userId","dimensionId")
);

-- CreateIndex
CREATE INDEX "user_dimension_levels_dimensionId_idx" ON "user_dimension_levels"("dimensionId");

-- AddForeignKey
ALTER TABLE "user_dimension_levels" ADD CONSTRAINT "user_dimension_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dimension_levels" ADD CONSTRAINT "user_dimension_levels_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
