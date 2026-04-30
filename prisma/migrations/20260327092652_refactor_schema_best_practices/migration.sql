-- DropForeignKey
ALTER TABLE "challenge_progress" DROP CONSTRAINT "ChallengeProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_mealId_fkey";

-- DropForeignKey
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "meals" DROP CONSTRAINT "Meal_userId_fkey";

-- DropForeignKey
ALTER TABLE "mission_progress" DROP CONSTRAINT "MissionProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "shopping_lists" DROP CONSTRAINT "ShoppingList_userId_fkey";

-- AlterTable
ALTER TABLE "challenge_progress" RENAME CONSTRAINT "ChallengeProgress_pkey" TO "challenge_progress_pkey";

-- AlterTable
ALTER TABLE "challenges" RENAME CONSTRAINT "Challenges_pkey" TO "challenges_pkey";

-- AlterTable
ALTER TABLE "meals" RENAME CONSTRAINT "Meal_pkey" TO "meals_pkey";

-- AlterTable
ALTER TABLE "mission_progress" RENAME CONSTRAINT "MissionProgress_pkey" TO "mission_progress_pkey";

-- AlterTable
ALTER TABLE "missions" RENAME CONSTRAINT "Missions_pkey" TO "missions_pkey";

-- AlterTable
ALTER TABLE "pantries" RENAME CONSTRAINT "Pantry_pkey" TO "pantries_pkey";

-- AlterTable
ALTER TABLE "shopping_lists" RENAME CONSTRAINT "ShoppingList_pkey" TO "shopping_lists_pkey";

-- CreateIndex
CREATE INDEX "meal_items_foodId_idx" ON "meal_items"("foodId");

-- CreateIndex
CREATE INDEX "meal_items_foodCategoryId_idx" ON "meal_items"("foodCategoryId");

-- CreateIndex
CREATE INDEX "meal_logs_userId_typeOfMeal_idx" ON "meal_logs"("userId", "typeOfMeal");

-- CreateIndex
CREATE INDEX "pantry_items_foodId_idx" ON "pantry_items"("foodId");

-- CreateIndex
CREATE INDEX "pantry_items_foodCategoryId_idx" ON "pantry_items"("foodCategoryId");

-- CreateIndex
CREATE INDEX "pantry_items_expiryDate_idx" ON "pantry_items"("expiryDate");

-- CreateIndex
CREATE INDEX "recipes_isPublic_category_idx" ON "recipes"("isPublic", "category");

-- CreateIndex
CREATE INDEX "shopping_list_items_foodId_idx" ON "shopping_list_items"("foodId");

-- CreateIndex
CREATE INDEX "shopping_list_items_foodCategoryId_idx" ON "shopping_list_items"("foodCategoryId");

-- RenameForeignKey
ALTER TABLE "challenge_progress" RENAME CONSTRAINT "ChallengeProgress_challengeId_fkey" TO "challenge_progress_challengeId_fkey";

-- RenameForeignKey
ALTER TABLE "meals" RENAME CONSTRAINT "Meal_recipeId_fkey" TO "meals_recipeId_fkey";

-- RenameForeignKey
ALTER TABLE "mission_progress" RENAME CONSTRAINT "MissionProgress_missionId_fkey" TO "mission_progress_missionId_fkey";

-- RenameForeignKey
ALTER TABLE "pantries" RENAME CONSTRAINT "Pantry_userId_fkey" TO "pantries_userId_fkey";

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Meal_barcode_key" RENAME TO "meals_barcode_key";

-- RenameIndex
ALTER INDEX "Meal_recipeId_idx" RENAME TO "meals_recipeId_idx";

-- RenameIndex
ALTER INDEX "Meal_userId_idx" RENAME TO "meals_userId_idx";

-- RenameIndex
ALTER INDEX "Pantry_userId_idx" RENAME TO "pantries_userId_idx";

-- RenameIndex
ALTER INDEX "Pantry_userId_key" RENAME TO "pantries_userId_key";

-- RenameIndex
ALTER INDEX "ShoppingList_userId_idx" RENAME TO "shopping_lists_userId_idx";

-- RenameIndex
ALTER INDEX "ShoppingList_userId_title_key" RENAME TO "shopping_lists_userId_title_key";
