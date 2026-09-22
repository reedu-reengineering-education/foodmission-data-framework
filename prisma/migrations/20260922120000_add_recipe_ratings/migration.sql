-- CreateTable
CREATE TABLE "recipe_ratings" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_ratings_recipeId_idx" ON "recipe_ratings"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ratings_userId_idx" ON "recipe_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ratings_recipeId_userId_key" ON "recipe_ratings"("recipeId", "userId");

-- AddForeignKey
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
