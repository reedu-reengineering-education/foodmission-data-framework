-- Rename tables to follow Prisma naming conventions (snake_case plural)
-- This preserves all data by using ALTER TABLE RENAME

-- Rename ShoppingList to shopping_lists
ALTER TABLE "ShoppingList" RENAME TO "shopping_lists";

-- Rename Pantry to pantries
ALTER TABLE "Pantry" RENAME TO "pantries";

-- Rename Meal to meals
ALTER TABLE "Meal" RENAME TO "meals";

-- Rename Missions to missions
ALTER TABLE "Missions" RENAME TO "missions";

-- Rename MissionProgress to mission_progress
ALTER TABLE "MissionProgress" RENAME TO "mission_progress";

-- Rename Challenges to challenges
ALTER TABLE "Challenges" RENAME TO "challenges";

-- Rename ChallengeProgress to challenge_progress
ALTER TABLE "ChallengeProgress" RENAME TO "challenge_progress";
