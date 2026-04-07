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

-- AlterTable: add shelf life FK to foods
ALTER TABLE "foods" ADD COLUMN "shelfLifeId" TEXT;

-- CreateIndex
CREATE INDEX "foods_shelfLifeId_idx" ON "foods"("shelfLifeId");

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_shelfLifeId_fkey" FOREIGN KEY ("shelfLifeId") REFERENCES "food_shelf_life"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add shelf life FK to food_categories
ALTER TABLE "food_categories" ADD COLUMN "shelfLifeId" TEXT;

-- CreateIndex
CREATE INDEX "food_categories_shelfLifeId_idx" ON "food_categories"("shelfLifeId");

-- AddForeignKey
ALTER TABLE "food_categories" ADD CONSTRAINT "food_categories_shelfLifeId_fkey" FOREIGN KEY ("shelfLifeId") REFERENCES "food_shelf_life"("id") ON DELETE SET NULL ON UPDATE CASCADE;
