-- AlterTable
ALTER TABLE "meal_logs" ALTER COLUMN "mealId" DROP NOT NULL,
ADD COLUMN     "flags" TEXT[],
ADD COLUMN     "swaps" TEXT[];
