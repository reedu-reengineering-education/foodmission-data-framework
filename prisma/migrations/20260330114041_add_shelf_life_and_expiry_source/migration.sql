-- AlterTable
ALTER TABLE "pantry_items" ADD COLUMN "expiryDateSource" TEXT;

-- CreateTable
CREATE TABLE "food_shelf_life" (
    "id" TEXT NOT NULL,
    "foodKeeperProductId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "categoryName" TEXT,
    "defaultStorageType" TEXT,
    "pantryMinDays" INTEGER,
    "pantryMaxDays" INTEGER,
    "pantryAfterOpeningDays" INTEGER,
    "refrigeratorMinDays" INTEGER,
    "refrigeratorMaxDays" INTEGER,
    "refrigeratorAfterOpeningDays" INTEGER,
    "freezerMinDays" INTEGER,
    "freezerMaxDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_shelf_life_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_shelf_life_foodKeeperProductId_key" ON "food_shelf_life"("foodKeeperProductId");

-- CreateIndex
CREATE INDEX "food_shelf_life_name_idx" ON "food_shelf_life"("name");

-- CreateIndex
CREATE INDEX "food_shelf_life_categoryName_idx" ON "food_shelf_life"("categoryName");
