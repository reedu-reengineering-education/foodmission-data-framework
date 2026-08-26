-- AlterTable
ALTER TABLE "generic_foods" 
ADD COLUMN     "legume" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meatOrFish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vegan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vegetarian" BOOLEAN NOT NULL DEFAULT false;
