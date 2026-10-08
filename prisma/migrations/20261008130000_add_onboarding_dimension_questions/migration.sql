-- Remaining onboarding survey questions (Q3-Q9, Q11, Q13, Q14, Q16, Q17),
-- scored per learning dimension to set each starting level. All nullable:
-- every survey question is optional and existing users are unaffected.

-- CreateEnum
CREATE TYPE "WeeklyLegumeFrequency" AS ENUM ('NEVER', 'LESS_THAN_ONCE_PER_WEEK', 'ONCE_PER_WEEK', 'SEVERAL_TIMES_PER_WEEK', 'DAILY');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('NEVER', 'RARELY', 'SOMETIMES', 'OFTEN', 'ALWAYS');

-- CreateEnum
CREATE TYPE "LabelFamiliarity" AS ENUM ('NOT_FAMILIAR', 'SLIGHTLY_FAMILIAR', 'MODERATELY_FAMILIAR', 'FAMILIAR', 'VERY_FAMILIAR');

-- CreateEnum
CREATE TYPE "DailyFruitVegServings" AS ENUM ('LESS_THAN_ONE', 'ONE_TO_TWO', 'THREE_TO_FOUR', 'FIVE_PLUS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "checksCountryOfOrigin" "HabitFrequency",
ADD COLUMN     "checksPackagingDisposal" "HabitFrequency",
ADD COLUMN     "choosesSeasonalProduce" "HabitFrequency",
ADD COLUMN     "considersSustainabilityInfo" "HabitFrequency",
ADD COLUMN     "dailyFruitVegServings" "DailyFruitVegServings",
ADD COLUMN     "plansMealsBeforeShopping" "HabitFrequency",
ADD COLUMN     "productionMethodsInfluence" "HabitFrequency",
ADD COLUMN     "readsIngredientLists" "HabitFrequency",
ADD COLUMN     "sustainabilityLabelFamiliarity" "LabelFamiliarity",
ADD COLUMN     "usesLeftovers" "HabitFrequency",
ADD COLUMN     "weeklyLegumeConsumption" "WeeklyLegumeFrequency",
ADD COLUMN     "wholeGrainFrequency" "HabitFrequency";

